import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // no global relaxations
  // ignore patterns migrated from .eslintrc.json
  { ignores: ['dist', 'node_modules'] },

  // base recommended rules for JS
  js.configs.recommended,

  // TypeScript recommended rules with type-checking enabled (strict)
  ...tseslint.configs.recommendedTypeChecked,

  // project-specific TS tweaks and parser options
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        // Enable type-aware linting without specifying explicit project paths
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];


