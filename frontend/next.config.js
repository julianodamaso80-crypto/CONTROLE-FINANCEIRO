/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'meucaixa.store' },
      { protocol: 'https', hostname: 'www.meucaixa.store' },
      { protocol: 'https', hostname: 'meucaixa.ia.br' },
      { protocol: 'https', hostname: 'www.meucaixa.ia.br' },
    ],
  },
};

module.exports = nextConfig;
