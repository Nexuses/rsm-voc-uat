// PM2 process definition for self-hosted (VPS) production.
//
// Deploy with `scripts/deploy.sh`, which reloads this file. Do not start the
// app with a bare `npm start` — that loses the settings below, most importantly
// `kill_timeout`, which is what keeps a post-call webhook ingest from being
// killed halfway through writing a survey response.
//
// Runs `next` directly rather than `npm start` because PM2 cluster mode needs a
// Node-executable script; with `npm` as the script, PM2 would only supervise
// the npm wrapper and cluster mode would not work.

module.exports = {
  apps: [
    {
      name: "rsm-voc",
      script: "./node_modules/next/dist/bin/next",
      // Bound to loopback: nginx is the only thing that should reach the app.
      // Next defaults to 0.0.0.0, which left port 3000 answering on every
      // interface with no TLS and none of nginx's headers.
      args: "start -H 127.0.0.1",
      cwd: __dirname,

      // Two cluster workers share port 3000, so `pm2 reload` restarts them one
      // at a time and the site never stops answering. This also means a worker
      // dying (OOM, crash) leaves the other one serving.
      exec_mode: "cluster",
      instances: 2,

      // A post-call webhook ingest runs OpenAI insight generation, embedding
      // creation, email notification and aggregate recompute inline, so a single
      // request can legitimately run for a minute. On reload PM2 sends SIGINT
      // and waits this long before SIGKILL, letting in-flight ingests finish
      // instead of losing a completed survey.
      kill_timeout: 60000,
      listen_timeout: 15000,

      // Recycle a worker that leaks before the kernel OOM killer picks a victim
      // for us. Steady-state usage is ~190 MB per worker.
      max_memory_restart: "400M",

      autorestart: true,
      min_uptime: 20000,
      max_restarts: 15,
      restart_delay: 3000,

      // Timestamped, merged logs. Restart forensics were previously impossible
      // because the log lines carried no time.
      time: true,
      merge_logs: true,

      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    // Opt-in: the 1 vCPU / 1.8 GB VM should be resized before a second
    // long-running process is added. Until then /api/cron/jobs drains the queue.
    ...(process.env.RSM_ENABLE_WORKER === "1"
      ? [
          {
            name: "rsm-voc-worker",
            script: "./node_modules/.bin/tsx",
            args: "scripts/worker.mts",
            cwd: __dirname,
            exec_mode: "fork",
            instances: 1,
            kill_timeout: 60000,
            max_memory_restart: "300M",
            autorestart: true,
            min_uptime: 20000,
            max_restarts: 15,
            restart_delay: 5000,
            time: true,
            merge_logs: true,
            env: { NODE_ENV: "production" },
          },
        ]
      : []),
  ],
};
