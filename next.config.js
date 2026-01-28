const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/v1',
        destination: '/v1/openapi.json',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/v1/:path((?!openapi\\.json$).*)',
        destination: '/api/v1/:path',
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.takealot.com' },
      { protocol: 'https', hostname: 'pos.snapscan.io' },
    ],
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
