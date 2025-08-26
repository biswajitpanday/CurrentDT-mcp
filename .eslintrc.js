module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended'
  ],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],
    '@typescript-eslint/no-explicit-any': 'off', // Allow any for MCP protocol
    'no-console': 'off',
    'no-undef': 'off', // TypeScript handles this
    'no-unused-vars': 'off', // Let @typescript-eslint handle this
    'no-useless-catch': 'warn' // Warn instead of error
  },
  env: {
    node: true,
    es6: true
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    '*.js',
    'coverage/**/*'
  ]
};