/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!**/*.test.ts',
    // typography.ts depende de PixelRatio de React Native: se verifica en el
    // E2E de Dynamic Type (.maestro/05-dynamic-type.yaml), no en unitarias.
    '!src/lib/typography.ts',
    // Modulos que solo envuelven dependencias nativas (MMKV, supabase-js): su
    // comportamiento se verifica en E2E, no en unitarias.
    '!src/lib/storage.ts',
    '!src/lib/supabase.ts',
    '!src/lib/remote.ts',
    '!src/lib/repository.remote.ts',
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 90, lines: 90, statements: 90 },
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, target: 'ES2022', lib: ['ES2022'], module: 'commonjs', baseUrl: '.', paths: { '@/*': ['./src/*'] } } }],
  },
};
