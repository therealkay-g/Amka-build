const isCapacitorBuild = process.env.CAPACITOR === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isCapacitorBuild
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        output: 'standalone',
      }),
};

export default nextConfig;
