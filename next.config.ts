import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // This allows all HTTPS URLs - you can restrict this to specific domains
      },
    ],
  },
};

export default nextConfig;
