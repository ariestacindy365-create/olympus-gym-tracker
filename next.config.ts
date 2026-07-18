import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The browser preview tool sometimes accesses the dev server via 127.0.0.1
  // instead of localhost; without this, Next blocks the HMR websocket as
  // cross-origin and the client falls into a full-reload retry loop.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
