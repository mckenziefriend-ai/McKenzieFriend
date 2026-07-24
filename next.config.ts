import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so an unrelated lockfile higher up
  // the filesystem doesn't get picked as the root during build.
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      // Document uploads go through a Server Action; the Next.js default of
      // 1 MB rejects a typical scanned court order. Client-side validation
      // caps individual files at 8 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
