import deprecation from 'eslint-plugin-deprecation';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['.agents/**', '.astro/**', 'dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      deprecation,
    },
    rules: {
      'deprecation/deprecation': 'error',
    },
  },
];
