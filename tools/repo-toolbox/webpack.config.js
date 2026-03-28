'use strict';

const path = require('path');

module.exports = {
  entry: './lib-esm/start.js',
  target: 'node',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'repo-toolbox.js'
  },
  externals: [
    // @microsoft/rush-lib is not webpack-friendly (source map references, native deps).
    // It is only used by actions that run from source (Tag stage), not from this bundle.
    ({ request }, callback) => {
      if (request && request.startsWith('@microsoft/rush-lib')) {
        callback(null, `commonjs2 ${request}`);
      } else {
        callback();
      }
    }
  ],
  ignoreWarnings: [
    {
      module: /node_modules/,
      message: /Critical dependency/
    }
  ]
};
