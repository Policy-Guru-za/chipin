const next = require('eslint-config-next');

module.exports = [
  {
    ignores: ['coverage/**', '.next/**', 'node_modules/**'],
  },
  ...next,
  {
    rules: {
      complexity: ['warn', 12],
      'max-lines': [
        'warn',
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      'max-lines-per-function': [
        'warn',
        {
          max: 120,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
    },
  },
];
