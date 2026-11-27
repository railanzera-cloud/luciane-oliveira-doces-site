import { createHash } from 'node:crypto';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';

const compress = {
  br: promisify(brotliCompress),
  gzip: promisify(gzip),
};
const compressible = /^(?:text\/|application\/(?:javascript|json)|image\/svg\+xml)/;
const immutable = /^\/(?:assets\/|images\/responsivas\/[^/]+-v\d+\.webp$)/;

function chooseEncoding(header = '') {
  const preferences = new Map(header.toLowerCase().split(',').map(part => {
    const [encoding, weight] = part.trim().split(';');
    return [encoding, weight ? Number(weight.trim().replace(/^q=/, '')) : 1];
  }));
  const quality = encoding => preferences.get(encoding) ?? preferences.get('*') ?? 0;
  if (quality('br') > 0 && quality('br') >= quality('gzip')) return 'br';
  return quality('gzip') > 0 ? 'gzip' : 'identity';
}

export function deliveryProfile(mode) {
  const encoded = new Map();
  return async (request, response, { resource, status, type, body }) => {
    const raw = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const cacheable = status === 200 && mode === 'pages';
    const headers = { 'Content-Type': type, 'X-Luciane-Delivery': mode };
    if (cacheable) {
      const etag = `W/"${createHash('sha256').update(raw).digest('base64url')}"`;
      headers['Cache-Control'] = immutable.test(resource)
        ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
      headers['ETag'] = etag;
      if (compressible.test(type)) headers['Vary'] = 'Accept-Encoding';
      if (request.headers['if-none-match']?.split(/\s*,\s*/).some(tag => tag === etag || tag === '*')) {
        response.writeHead(304, headers);
        return response.end();
      }
    }
    const encoding = cacheable && raw.length >= 1024 && compressible.test(type)
      ? chooseEncoding(request.headers['accept-encoding']) : 'identity';
    let payload = raw;
    if (encoding !== 'identity') {
      const key = `${headers.ETag}/${encoding}`;
      if (!encoded.has(key)) {
        const options = encoding === 'br' ? { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } } : {};
        encoded.set(key, compress[encoding](raw, options));
      }
      payload = await encoded.get(key);
      headers['Content-Encoding'] = encoding;
    }
    headers['Content-Length'] = payload.length;
    response.writeHead(status, headers);
    response.end(request.method === 'HEAD' ? undefined : payload);
  };
}
