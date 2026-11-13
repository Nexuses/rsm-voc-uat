import crypto from "node:crypto";
import fs from "node:fs/promises";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
if (!secret) {
  throw new Error("ELEVENLABS_WEBHOOK_SECRET is required");
}

const rawBody = await fs.readFile(
  new URL(
    "../__fixtures__/elevenlabs-post-call-transcription.json",
    import.meta.url
  ),
  "utf8"
);
const timestamp = Math.floor(Date.now() / 1000).toString();
const digest = crypto
  .createHmac("sha256", secret)
  .update(`${timestamp}.${rawBody}`)
  .digest("hex");

const response = await fetch(`${baseUrl}/api/webhooks/elevenlabs`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "elevenlabs-signature": `t=${timestamp},v0=${digest}`,
  },
  body: rawBody,
});
const text = await response.text();

console.log(`POST ${baseUrl}/api/webhooks/elevenlabs`);
console.log(`${response.status} ${text}`);
if (!response.ok) process.exitCode = 1;
