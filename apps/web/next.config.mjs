/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@spec-forge/core", "@spec-forge/db"],
  experimental: {
    serverComponentsExternalPackages: ["postgres"],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };
    return config;
  },
};

export default nextConfig;
