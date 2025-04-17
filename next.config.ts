import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/',
        destination: '/sign-in',
        permanent: true, // Use true for permanent redirect if appropriate
      },
    ]
  },
};

export default nextConfig;
