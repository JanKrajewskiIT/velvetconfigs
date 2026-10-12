const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const isLoopbackUrl = (url) => LOOPBACK_HOSTS.has(url.hostname);
