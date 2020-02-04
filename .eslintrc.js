module.exports = {
  'extends': [
    'airbnb-typescript',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:cypress/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:jsx-a11y/recommended',
    'plugin:react/recommended',
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaVersion': 2019,
    'project': 'tsconfig.json',
    'sourceType': 'module',
    'tsconfigRootDir': __dirname,
  },
  'plugins': [
    'cypress',
    'jsx-a11y',
    'import',
    'react',
    'react-hooks'
  ],
  'rules': {
    '@typescript-eslint/semi': ['warn', 'never'],
    'comma-dangle': ['warn', 'only-multiline'],
    'func-names': ['warn', 'as-needed'],
    'import/no-cycle': ['off'],
    'import/prefer-default-export': ['off'],
    'max-len': ['warn', {'code': 120}],
    'no-console': ['warn'],
    "no-trailing-spaces": ["warn", { "skipBlankLines": true }],
    'no-underscore-dangle': ['off'],
    'object-curly-newline': ['off'],
    'object-curly-spacing': ['error', 'never'],
    'object-shorthand': ['off'],
    'prefer-destructuring': ['off'],
    'react/jsx-boolean-value': ['warn', 'always'],
    'react/jsx-curly-brace-presence': ['warn', {'props': 'never', 'children': 'never'}],
    'react/jsx-tag-spacing': ['warn', {'beforeSelfClosing': 'never'}],
    "react-hooks/rules-of-hooks": ['warn'],
    "react-hooks/exhaustive-deps": ['warn'],
    'react/prop-types': ['off'],
    'semi': ['warn', 'never'],
    'spaced-comment': ['warn', 'always', {'markers': ['/']}],
  },
}
/*
// Disable ESLint
module.exports = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 2019,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
}
*/