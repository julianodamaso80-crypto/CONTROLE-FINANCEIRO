/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'controlei.ia.br' },
      { protocol: 'https', hostname: 'www.controlei.ia.br' },
    ],
  },
};

module.exports = nextConfig;
