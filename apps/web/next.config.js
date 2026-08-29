/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@docs-flow/ui', '@docs-flow/types'],
  output: 'standalone',
};

module.exports = nextConfig;
