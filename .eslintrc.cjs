/**
 * Eslint config applies to all packages - except each package must define mocha-specific overrides
 * due to complexity in identifying dependencies and their sources from parent package.json files
 */
module.exports = {
  root: true,
  env: { node: true },
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['import', 'chai-friendly', 'sort-destructure-keys', 'sort-keys-plus'],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      extends: [
        'eslint:recommended',
        'airbnb-base',
        'airbnb-typescript/base',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'plugin:chai-friendly/recommended',
        'plugin:typescript-sort-keys/recommended',
        'prettier',
      ],
      settings: {
        'import/resolver': {
          node: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
          },
        },
        'import/internal-regex': '^@lit-protocol/',
        'import/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
      },
      rules: {
        'no-console': 'error',
        'import/prefer-default-export': ['off'],
        'import/no-default-export': ['error'],
        'import/no-relative-packages': ['error'],
        'import/no-duplicates': ['error'],
        'import/no-unresolved': ['error'],
        'import/order': [
          'error',
          {
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
            'newlines-between': 'always',
            groups: [
              'builtin',
              'external',
              'internal',
              ['sibling', 'parent', 'index'],
              'object',
              'type',
            ],
          },
        ],
        'typescript-sort-keys/interface': 'error',
        'typescript-sort-keys/string-enum': 'error',
        'sort-keys-plus/sort-keys': [
          'error',
          'asc',
          {
            caseSensitive: false,
            natural: true,
            minKeys: 2,
            allowLineSeparatedGroups: true,
            allCaps: 'first',
            shorthand: 'first',
          },
        ],
        'sort-destructure-keys/sort-destructure-keys': ['error', { caseSensitive: false }],
        'class-methods-use-this': ['off'],
      },
    },
  ],
};
