/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['postgres', 'pgvector'],
  // Empty turbopack config acknowledges Next.js 16 default Turbopack usage
  // serverExternalPackages handles postgres/pgvector externalization for both bundlers
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent bundling of Node.js built-in modules used by postgres
      // Setting to false tells webpack not to try to polyfill these
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        fs: false,
        path: false,
        perf_hooks: false,
        dns: false,
        os: false,
        util: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
      };

      // Ensure postgres is treated as external
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('postgres');
      }
    }
    return config;
  },
};

export default nextConfig;
