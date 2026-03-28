'use strict';

const path = require('path');

module.exports = {
  entry: './lib/start.js',
  target: 'node',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'bundle'),
    filename: 'repo-toolbox.js'
  }
};
