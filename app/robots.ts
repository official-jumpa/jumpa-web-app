import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/$', '/onboarding'],
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
