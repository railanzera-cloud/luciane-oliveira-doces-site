// Pages advanced-mode entry point, packaged as _worker.js.
// Only the four organic links invoke this worker via _routes.json.
export const shortLinks = {
  '/ig': { utm_source: 'instagram', utm_medium: 'organic_social', utm_campaign: 'bio_instagram' },
  '/fb': { utm_source: 'facebook', utm_medium: 'organic_social', utm_campaign: 'bio_facebook' },
  '/stories': { utm_source: 'instagram', utm_medium: 'organic_social', utm_campaign: 'stories_organico' },
  '/status': { utm_source: 'whatsapp', utm_medium: 'organic_social', utm_campaign: 'status_whatsapp' },
};

const worker = {
  async fetch(request, env) {
    const destination = new URL(request.url);
    const defaults = Object.hasOwn(shortLinks, destination.pathname)
      ? shortLinks[destination.pathname]
      : undefined;
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
