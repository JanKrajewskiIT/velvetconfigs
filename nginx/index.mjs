import { isLoopbackUrl } from '../env/url.mjs';

const origins = (sources, name, allowLoopbackHttp) =>
  sources.map((source) => {
    if (source === "'self'") return source;
    const url = new URL(source);
    const loopback = allowLoopbackHttp && isLoopbackUrl(url);
    if (
      (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) ||
      url.origin !== source ||
      url.username ||
      url.password
    ) {
      throw new TypeError(`${name} must contain HTTPS origins, explicitly enabled loopback HTTP origins or 'self'.`);
    }
    return source;
  });

const createFrameHeader = (ancestors) => {
  if (ancestors.length === 0) return "    add_header X-Frame-Options 'DENY' always;";
  if (ancestors.every((source) => source === "'self'")) return "    add_header X-Frame-Options 'SAMEORIGIN' always;";
  return '';
};

export const createSpaNginxConfig = ({
  connectSources = [],
  frameSources = [],
  frameAncestors = [],
  allowInlineStyles = false,
  allowRemoteImages = false,
  allowBlobMedia = false,
  allowLoopbackHttp = false,
} = {}) => {
  const ancestors = origins(frameAncestors, 'frameAncestors', allowLoopbackHttp);
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': allowInlineStyles ? ["'self'", "'unsafe-inline'"] : ["'self'"],
    'img-src': ["'self'", 'data:', 'blob:', ...(allowRemoteImages ? ['https:'] : [])],
    'font-src': ["'self'", 'data:'],
    'media-src': ["'self'", ...(allowBlobMedia ? ['blob:'] : [])],
    'connect-src': [
      "'self'",
      ...(allowBlobMedia ? ['blob:'] : []),
      ...origins(connectSources, 'connectSources', allowLoopbackHttp),
    ],
    'frame-src': ["'self'", ...origins(frameSources, 'frameSources', allowLoopbackHttp)],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ancestors.length ? ancestors : ["'none'"],
  };
  const policy = Object.entries(directives)
    .map(([name, sources]) => `${name} ${[...new Set(sources)].join(' ')}`)
    .join('; ');
  const frameHeader = createFrameHeader(ancestors);
  return `server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    server_tokens off;
    client_max_body_size 16m;
    client_body_temp_path /tmp/client-body;

    add_header X-Content-Type-Options 'nosniff' always;
${frameHeader}
    add_header Referrer-Policy 'strict-origin-when-cross-origin' always;
    add_header Permissions-Policy 'camera=(), microphone=(), geolocation=()' always;
    add_header Content-Security-Policy "${policy}" always;

    include /etc/nginx/snippets/velvet-spa.conf;
}
`;
};
