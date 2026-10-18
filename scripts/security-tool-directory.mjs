import path from 'node:path';

export const securityToolDirectory = () =>
  path.resolve(process.env.RUNNER_TEMP ?? process.cwd(), 'velvet-security-tools');
