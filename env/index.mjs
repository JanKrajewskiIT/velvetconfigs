import { isLoopbackUrl } from './url.mjs';

const ENV_KINDS = ['string', 'url'];

export const validateEnv = (values, schema, { httpsOnly = false, allowLoopbackHttp = false } = {}) => {
  const result = {};
  for (const [name, kind] of Object.entries(schema)) {
    if (!ENV_KINDS.includes(kind)) {
      throw new TypeError(`validateEnv: "${name}" must use ${ENV_KINDS.join(' or ')}.`);
    }
    const value = values[name]?.trim();
    if (!value) throw new Error(`Missing build environment variable: ${name}.`);
    if (kind === 'url') {
      let url;
      try {
        url = new URL(value);
      } catch {
        throw new TypeError(`Build environment variable ${name} must be an absolute HTTP URL.`);
      }
      const loopback = allowLoopbackHttp && isLoopbackUrl(url);
      const protocols = httpsOnly && !loopback ? ['https:'] : ['https:', 'http:'];
      if (!protocols.includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new TypeError(
          `Build environment variable ${name} must be a ${protocols.join(' or ')} URL without credentials, query or fragment.`,
        );
      }
    }
    result[name] = value;
  }
  return result;
};
