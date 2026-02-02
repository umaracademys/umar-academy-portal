/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'packages/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { window: 'readonly', document: 'readonly', fetch: 'readonly' },
    },
    rules: {
      'no-duplicate-imports': 'error',
      'no-duplicate-case': 'error',
    },
  },
];
