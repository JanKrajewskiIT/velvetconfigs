const KINDS = ['browser-library', 'browser-app', 'tooling'];
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const pathsPattern = (paths) => `^(?:${paths.map(escapePattern).join('|')})(?:/|$)`;
const assertKeys = (value, keys, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`Invalid ${name}.`);
  const unknown = Object.keys(value).filter((key) => !keys.includes(key));
  if (unknown.length) throw new TypeError(`Unknown ${name} fields: ${unknown.join(', ')}.`);
};

export const readQualityPolicy = (value) => {
  assertKeys(
    value,
    ['$schema', 'kind', 'paths', 'tsConfig', 'browserPaths', 'forbidden', 'duplication'],
    'quality policy',
  );
  if (!KINDS.includes(value.kind)) throw new TypeError(`kind must be one of: ${KINDS.join(', ')}.`);
  const assertPaths = (paths, name, allowEmpty = false) => {
    if (
      !Array.isArray(paths) ||
      (!allowEmpty && !paths.length) ||
      paths.some(
        (item) =>
          typeof item !== 'string' ||
          !/^[\w./-]+$/u.test(item) ||
          item.startsWith('/') ||
          item.split('/').includes('..'),
      )
    )
      throw new TypeError(`${name} must contain relative directories within the project.`);
    return paths;
  };
  const paths = assertPaths(value.paths, 'paths');
  if (
    typeof value.tsConfig !== 'string' ||
    !value.tsConfig.endsWith('.json') ||
    !/^[\w./-]+$/u.test(value.tsConfig) ||
    value.tsConfig.startsWith('/') ||
    value.tsConfig.split('/').includes('..')
  )
    throw new TypeError('tsConfig must name the consumer TypeScript configuration.');
  const browserPaths =
    value.browserPaths === undefined
      ? value.kind === 'tooling'
        ? []
        : paths
      : assertPaths(value.browserPaths, 'browserPaths', true);
  const duplication = value.duplication === undefined ? {} : value.duplication;
  assertKeys(duplication, ['minTokens', 'minLines', 'maxPercentage'], 'duplication policy');
  const minTokens = duplication.minTokens ?? 100;
  const minLines = duplication.minLines ?? 10;
  if (!Number.isInteger(minTokens) || minTokens < 50 || !Number.isInteger(minLines) || minLines < 5)
    throw new TypeError('Duplication minimums must be at least 50 tokens and 5 lines.');
  const maxPercentage = duplication.maxPercentage;
  if (maxPercentage !== undefined && (!Number.isFinite(maxPercentage) || maxPercentage < 0 || maxPercentage > 100))
    throw new TypeError('duplication.maxPercentage must be between 0 and 100.');
  const forbidden = value.forbidden === undefined ? [] : value.forbidden;
  if (
    !Array.isArray(forbidden) ||
    forbidden.some(
      (rule) =>
        !rule ||
        typeof rule.name !== 'string' ||
        !rule.name ||
        typeof rule.from !== 'string' ||
        !rule.from ||
        typeof rule.to !== 'string' ||
        !rule.to,
    )
  )
    throw new TypeError('forbidden must contain named from/to regular expressions.');
  for (const rule of forbidden) {
    assertKeys(rule, ['name', 'from', 'to'], 'architecture boundary');
    new RegExp(rule.from, 'u');
    new RegExp(rule.to, 'u');
  }
  return {
    kind: value.kind,
    paths,
    tsConfig: value.tsConfig,
    browserPaths,
    forbidden,
    duplication: { minTokens, minLines, maxPercentage },
  };
};

export const createArchitectureConfig = (input) => {
  const policy = readQualityPolicy(input);
  const source = pathsPattern(policy.paths);
  const forbidden = [
    { name: 'no-cycles', severity: 'error', from: { path: source }, to: { circular: true } },
    { name: 'no-unresolved-imports', severity: 'error', from: { path: source }, to: { couldNotResolve: true } },
    {
      name: 'no-undeclared-packages',
      severity: 'error',
      from: { path: source },
      to: {
        dependencyTypes: ['npm-no-pkg'],
        dependencyTypesNot: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'],
      },
    },
    ...policy.forbidden.map(({ name, from, to }) => ({
      name,
      severity: 'error',
      from: { path: from },
      to: { path: to },
    })),
  ];
  if (policy.browserPaths.length)
    forbidden.push({
      name: 'no-node-in-browser',
      severity: 'error',
      from: { path: pathsPattern(policy.browserPaths) },
      to: { dependencyTypes: ['core'] },
    });
  if (policy.kind === 'browser-library')
    forbidden.push(
      {
        name: 'no-app-in-library',
        severity: 'error',
        from: { path: source },
        to: { path: '(^|/)(VelvetDemo|Recron|recron-web|Projects)(/|$)|^(@jankrajewskiit/demo|recron)(/|$)' },
      },
      {
        name: 'no-runtime-dev-dependencies',
        severity: 'error',
        from: { path: source },
        to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['npm', 'npm-peer', 'type-only'] },
      },
    );
  return {
    forbidden,
    options: {
      doNotFollow: { path: 'node_modules' },
      exclude: { path: '^(?!node_modules/)(?:.*/|)(dist|build|reports|\\.agents|\\.deployment)/' },
      tsPreCompilationDeps: true,
      tsConfig: { fileName: policy.tsConfig },
      enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['types', 'import', 'browser', 'default'] },
    },
  };
};

export const createDuplicationConfig = (input) => {
  const { paths, duplication } = readQualityPolicy(input);
  return {
    path: paths,
    minTokens: duplication.minTokens,
    minLines: duplication.minLines,
    mode: 'mild',
    format: ['typescript', 'tsx', 'javascript', 'jsx', 'css'],
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/reports/**',
      '**/*.d.ts',
      '**/*.d.mts',
      '**/api/schema/**',
      '**/api-contracts/**',
      '**/velvet/**',
      '**/.agents/**',
      '**/.deployment/**',
    ],
    reporters: ['json'],
    silent: true,
    absolute: false,
  };
};
