// Pages advanced-mode entry point, packaged as _worker.js.
// The root resolves static category entries, while organic links keep their redirects.
export const shortLinks = {
  '/ig': { utm_source: 'instagram', utm_medium: 'organic_social', utm_campaign: 'bio_instagram' },
  '/fb': { utm_source: 'facebook', utm_medium: 'organic_social', utm_campaign: 'bio_facebook' },
  '/stories': { utm_source: 'instagram', utm_medium: 'organic_social', utm_campaign: 'stories_organico' },
  '/status': { utm_source: 'whatsapp', utm_medium: 'organic_social', utm_campaign: 'status_whatsapp' },
};

export const catalogEntryFiles = Object.freeze({
  cones: 'cardapio-inicial/cones/index.html',
  fatias: 'cardapio-inicial/fatias/index.html',
  natal: 'cardapio-inicial/natal/index.html',
  pipocas: 'cardapio-inicial/pipocas/index.html',
  trufadas: 'cardapio-inicial/trufadas/index.html',
});

const worker = {
  async fetch(request, env) {
    const destination = new URL(request.url);
    const defaults = Object.hasOwn(shortLinks, destination.pathname)
      ? shortLinks[destination.pathname]
      : undefined;
    if (destination.pathname === '/' && (request.method === 'GET' || request.method === 'HEAD')) {
      const category = destination.searchParams.get('categoria');
      if (Object.hasOwn(catalogEntryFiles, category)) {
        const asset = new URL('/' + catalogEntryFiles[category].replace(/index\.html$/, ''), destination);
        const response = await env.ASSETS.fetch(new Request(asset, request));
        if (response.ok || response.status === 304) return response;
      }
    }
    if (!defaults) return env.ASSETS.fetch(request);

    destination.pathname = '/';
    for (const [key, value] of Object.entries(defaults)) {
      // Preserve existing values, including empty and repeated parameters.
      if (!destination.searchParams.has(key)) destination.searchParams.append(key, value);
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: destination.href,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  },
};

export default worker;
