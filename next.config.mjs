const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  devIndicators: false,
  poweredByHeader: false,
  experimental: { cpus: 2 },
  webpack(config) {
    // Reuse the installed native toolchain without duplicating large disk caches.
    config.cache = { type: "memory" };
    return config;
  },
};
export default nextConfig;
