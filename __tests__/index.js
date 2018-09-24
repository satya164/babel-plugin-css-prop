/* @flow */

const path = require('path');
const tester = require('babel-plugin-tester');

tester({
  plugin: require('../index'),
  pluginName: 'css-prop',
  fixtures: path.join(__dirname, '..', '__fixtures__'),
});
