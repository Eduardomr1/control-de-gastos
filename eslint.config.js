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
    files: ['src/lib/money.ts', 'src/lib/typography.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['**/*.test.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
