/* @flow */

const path = require('path');
const tester = require('babel-plugin-tester');

const fixtures = path.join(__dirname, '..', '__fixtures__');

tester({
  title: 'with { target: "none" }',
  plugin: require('../index'),
  pluginName: 'css-prop',
  pluginOptions: {
    target: 'none',
  },
  fixtures: path.join(fixtures, 'none'),
});

tester({
  title: 'with { target: "linaria" }',
  plugin: require('../index'),
  pluginName: 'css-prop',
  pluginOptions: {
    target: 'linaria',
  },
  fixtures: path.join(fixtures, 'linaria'),
});

tester({
  title: 'with { target: "styled-components" }',
  plugin: require('../index'),
  pluginName: 'css-prop',
  pluginOptions: {
    target: 'styled-components',
  },
  fixtures: path.join(fixtures, 'styled-components'),
});

tester({
  title: 'with { target: "auto" }',
  plugin: require('../index'),
  pluginName: 'css-prop',
  pluginOptions: {
    target: 'auto',
  },
  tests: [
    ...['detects-linaria', 'detects-styled-components'].map(t => ({
      title: t.replace(/-/g, ' '),
      setup() {
        process.chdir(path.join(fixtures, 'auto', t));
      },
      fixture: path.join(fixtures, 'auto', t, 'code.js'),
      outputFixture: path.join(fixtures, 'auto', t, 'output.js'),
    })),
    ...[
      {
        t: 'throws-if-no-package-json',
        error: /Couldn't read 'package.json' to determine the CSS in JS library./,
      },
      {
        t: 'throws-if-not-in-dep',
        error: /Couldn't find 'linaria' or 'styled-components' in the 'package.json'/,
      },
    ].map(({ t, error }) => ({
      title: t.replace(/-/g, ' '),
      setup() {
        process.chdir(path.join(fixtures, 'auto', t));
      },
      fixture: path.join(fixtures, 'auto', t, 'code.js'),
      error,
    })),
  ],
});
