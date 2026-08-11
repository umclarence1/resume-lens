import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: process.env.VERCEL
    ? { resolveAlias: { "cloudflare:workers": "./lib/cloudflare-workers-stub.ts" } }
    : undefined,
};

export default nextConfig;
