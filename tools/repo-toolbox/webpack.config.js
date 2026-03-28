'use strict';

const path = require('path');

module.exports = {
  entry: './lib-esm/start.js',
  target: 'node',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'repo-toolbox.js'
  }
};
