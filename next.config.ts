import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
