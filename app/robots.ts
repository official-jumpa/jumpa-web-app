import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/$', '/onboarding', '/sign-in', '/sign-up', '/_next/', '/images/', '/fonts/', '/icons/', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png'],
        disallow: ['/account/', '/api/', '/*'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'AnthropicAI',
          'ClaudeBot',
          'Claude-Web',
          'Omgilibot',
          'FacebookExternalHit',
          'PerplexityBot',
          'Bytespider',
          'CCBot',
        ],
        disallow: '/',
      },
    ],
  };
}
