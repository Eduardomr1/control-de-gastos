/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  collectCoverageFrom: [
    'src/shared/**/*.ts',
    'src/features/**/*.ts',
    '!**/*.test.ts',
    // tipografia.ts depende de PixelRatio de React Native: se verifica en el
    // E2E de Dynamic Type (.maestro/05-dynamic-type.yaml), no en unitarias.
    '!src/shared/theme/tipografia.ts',
    // Modulos que solo envuelven dependencias nativas (MMKV, supabase-js,
    // expo-sqlite) o hablan directo con la red: su comportamiento se verifica
    // en E2E o en dispositivo, no en unitarias.
    '!src/shared/storage/deviceStorage.ts',
    '!src/shared/lib/supabase.ts',
    '!src/features/gastos/store/expenseDb.ts',
    '!src/features/gastos/store/syncQueueInstance.ts',
    '!src/features/gastos/api/sync.ts',
    '!src/features/gastos/api/expenses.remote.ts',
    '!src/features/categorias/api/categorias.remote.ts',
    // Barrels que solo reexportan: no tienen lógica propia que romper, y
    // Jest los marca en 0% porque las pruebas importan cada módulo interno
    // directo, no a través del barrel (y los tests de auth.remote.ts
    // mockean el barrel de gastos por completo).
    '!src/features/gastos/index.ts',
    '!src/features/auth/index.ts',
    '!src/features/categorias/index.ts',
    '!src/shared/ui/index.ts',
    // colores.ts es un objeto de datos sin lógica, y los componentes que lo
    // consumen (GTexto, GBoton, GCampo) no tienen prueba unitaria propia por
    // la misma razón que useSession.ts: dependen de un entorno de render que
    // este proyecto no monta en Node.
    '!src/shared/theme/colores.ts',
    // Hooks de React: useQueries/useMutation/useState+useEffect necesitan un
    // entorno de render (React Testing Library con jest-expo o similar), que
    // este proyecto no tiene. Se verifican en los flujos de .maestro/.
    '!src/features/gastos/hooks/**',
    '!src/features/categorias/hooks/**',
    '!src/features/auth/hooks/**',
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 90, lines: 90, statements: 90 },
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true, target: 'ES2022', lib: ['ES2022'], module: 'commonjs', baseUrl: '.', paths: { '@/*': ['./src/*'] } } }],
  },
};
