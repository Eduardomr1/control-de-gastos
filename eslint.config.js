const tseslint = require('typescript-eslint');
const eslint = require('@eslint/js');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/**', 'coverage/**', '.expo/**', 'dist/**'],
  },
  {
    // Archivos de configuración: corren en Node con CommonJS, no en la app.
    files: ['*.config.js', 'babel.config.js', 'eslint.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      /**
       * Reglas que protegen las decisiones de dominio del proyecto.
       * Un lint que solo revisa formato no aporta nada que Prettier no dé;
       * estas convierten los bugs ya corregidos en errores de compilación.
       */

      // BUG-005: la altura fija recorta el texto al ampliar la fuente.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Property[key.name='height'][value.type='Literal'][value.value!=null]",
          message:
            'Usa minHeight en lugar de height fija: rompe Dynamic Type (BUG-005).',
        },
        {
          selector: "MemberExpression[property.name='getUTCMonth']",
          message:
            'El periodo se calcula en hora local con monthKeyOf, no en UTC (BUG-002).',
        },
        {
          selector: "MemberExpression[property.name='getUTCFullYear']",
          message:
            'El periodo se calcula en hora local con monthKeyOf, no en UTC (BUG-002).',
        },
      ],

      // BUG-001: el dominio opera en centavos enteros, nunca en flotantes.
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'round',
          message:
            'Redondear montos indica cálculo en flotantes. Usa las funciones de money.ts (BUG-001).',
        },
      ],
    },
  },
  {
    // money.ts es el único lugar autorizado para redondear: es la frontera
    // donde el dominio convierte a y desde representación decimal.
    //
    // ponytail: glob por nombre en vez de ruta literal. La migración a
    // Feature-First mueve estos archivos de carpeta; una ruta literal dejaría
    // de coincidir y la regla se dispararía sobre código que no cambió. El
    // techo: un futuro src/features/x/money.ts también quedaría exento. Si eso
    // llega a pasar, estrechar a 'src/shared/**/money.ts'.
    files: ['**/money.ts', '**/typography.ts', '**/tipografia.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    // mappers.ts es la frontera con la base de datos: reconstruye la hora local
    // a partir de un instante UTC y el offset guardado, asi que necesita los
    // getters UTC de forma deliberada. Es el unico lugar autorizado, y su
    // correccion esta cubierta por pruebas de ida y vuelta.
    // ponytail: glob por nombre, mismo motivo que el bloque anterior.
    files: ['**/mappers.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  /**
   * Fronteras de arquitectura (Reglas 1, 2 y 4 de
   * docs/arquitectura/estructura-archivos.md), más el punto único de contacto
   * con MMKV. Un feature nunca importa la ruta interna de otro: solo por
   * dentro de sí mismo, con rutas relativas (por eso estos patrones apuntan a
   * `@/features/*`, la forma absoluta — nunca coinciden con un `../api`
   * dentro del propio feature). `shared/` nunca importa de ningún feature.
   * `app/` solo puede pedir el barrel, nunca una ruta interna.
   *
   * Las tres reglas de `no-restricted-imports` de abajo van en un bloque por
   * ámbito, no repartidas en bloques separados: en flat config, cuando dos
   * bloques que coinciden con el mismo archivo fijan la misma regla, el
   * último gana — no se fusionan. Un bloque final de MMKV aplicado a todo
   * `**\/*.ts` habría borrado silenciosamente estas reglas de frontera para
   * cualquier archivo dentro de `src/features/` o `src/shared/`.
   */
  {
    files: ['src/features/**/*.ts', 'src/features/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/features/*/api/**',
                '@/features/*/store/**',
                '@/features/*/screens/**',
                '@/features/*/components/**',
                '@/features/*/hooks/**',
              ],
              message:
                'Un feature no importa la ruta interna de otro. Usa su barrel: @/features/<nombre> (Regla 2).',
            },
          ],
          paths: [
            {
              name: 'react-native-mmkv',
              message:
                'react-native-mmkv solo se importa en src/shared/storage/deviceStorage.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.ts', 'src/shared/**/*.tsx'],
    ignores: ['src/shared/storage/deviceStorage.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**'],
              message: 'shared/ nunca importa de un feature (Regla 1).',
            },
          ],
          paths: [
            {
              name: 'react-native-mmkv',
              message:
                'react-native-mmkv solo se importa en src/shared/storage/deviceStorage.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                'app/ solo importa el barrel del feature (@/features/<nombre>), nunca una ruta interna (Regla 4).',
            },
          ],
          paths: [
            {
              name: 'react-native-mmkv',
              message:
                'react-native-mmkv solo se importa en src/shared/storage/deviceStorage.ts.',
            },
          ],
        },
      ],
    },
  },
);
