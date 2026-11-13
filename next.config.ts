import type { NextConfig } from "next";

// CSP ships report-only first: the survey loads ElevenLabs, Cloudinary and the
// RSM webfont CDN, and an enforced policy derived blind would break it.
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self' data: https:",
  "connect-src 'self' https://api.elevenlabs.io wss://api.elevenlabs.io https://*.elevenlabs.io wss://*.elevenlabs.io https://*.livekit.cloud wss://*.livekit.cloud",
  "media-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const baseSecurityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig: NextConfig = {
  // Build output directory. `scripts/deploy.sh` sets NEXT_DIST_DIR so a deploy
  // can compile into a side directory while the running server keeps serving
  // the previous build from `.next`. Unset (local dev, CI, Vercel) it is `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Version skew protection for rolling reloads. Without this, a browser still
  // holding a page from the previous build calls Server Action IDs the new
  // server no longer knows, which surfaces as
  // "Failed to find Server Action" errors. With it, Next detects the mismatch
  // and does a hard navigation instead. `scripts/deploy.sh` sets this to the
  // deployed commit SHA.
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,

  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: baseSecurityHeaders },
      {
        // Embeddable surfaces must stay frameable by client websites.
        source: "/((?!widget|reports).*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/results/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/rsmglobal/**",
      },
    ],
  },
};

export default nextConfig;
