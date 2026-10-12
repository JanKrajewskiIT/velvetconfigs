import { spawnSync } from 'node:child_process';

export const runNpm = (arguments_, options = {}) => {
  const executable = process.env.npm_execpath;
  if (!executable) throw new Error('Run this command through npm run so the selected npm CLI is available.');
  const result = spawnSync(process.execPath, [executable, ...arguments_], { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`npm was terminated by ${result.signal}.`);
  return result;
};
