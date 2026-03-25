import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withLlamaIndex = require("llamaindex/next").default;

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default withLlamaIndex(nextConfig);
