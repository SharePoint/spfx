'use strict';

const { PreserveDynamicRequireWebpackPlugin } = require('@rushstack/webpack-preserve-dynamic-require-plugin');

module.exports = {
  entry: './lib-esm/start.js',
  target: 'node',
  mode: 'production',
  output: {
    path: `${__dirname}/dist`,
    filename: 'repo-toolbox.js'
  },
  plugins: [new PreserveDynamicRequireWebpackPlugin()]
};
