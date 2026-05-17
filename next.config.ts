import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // hide the on-screen dev indicator (the floating "N" badge) — was
  // overlapping the footer content during local dev. Build / runtime
  // errors are still surfaced normally.
  devIndicators: false,
};

module.exports = {
  allowedDevOrigins: ['192.168.29.173', '192.168.29.166'],
}

export default nextConfig;
