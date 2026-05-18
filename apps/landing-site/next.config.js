/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@taxiflow/shared-types', '@taxiflow/shared-utils', '@taxiflow/shared-constants'],
};
module.exports = nextConfig;
