/* @flow */

const { join } = require('path');
const syntax = require('@babel/plugin-syntax-jsx').default;

const imports = (t, p, named, source) => {
  if (
    (named ? t.isImportSpecifier(p) : t.isImportDefaultSpecifier(p)) &&
    t.isImportDeclaration(p.parentPath)
  ) {
    return p.parentPath.node.source.value === source;
  }

  if (t.isVariableDeclarator(p)) {
    const call =
      t.isMemberExpression(p.node.init) && named
        ? p.node.init.object
        : p.node.init;

    if (
      t.isCallExpression(call) &&
      t.isIdentifier(call.callee) &&
      call.callee.name === 'require' &&
      call.arguments.length === 1
    ) {
      const node = call.arguments[0];

      if (t.isStringLiteral(node)) {
        return node.value === source;
      } else if (t.isTemplateLiteral(node) && node.quasis.length === 1) {
        return node.quasis[0].value.cooked === source;
      }
    }
  }

  return false;
};

/*::
type State = {
  required: 'pending' | 'linaria' | 'styled-components' | 'none';
  items: Array<any>
}
*/

/* ::
type Options = {
  target?: 'linaria' | 'styled-components' | 'auto' | 'none',
}
*/

module.exports = function(
  babel /*: any */,
  { target = 'auto' } /*: Options */
) {
  const { types: t } = babel;

  return {
    inherits: syntax,

    visitor: {
      Program: {
        enter(path /*: any */, state /*: State */) {
          // Whether we've inserted the require statement
          state.required = 'pending';
          // Nodes to insert
          state.items = [];
        },

        exit(path /*: any */, state /*: State */) {
          // Add the new nodes to the end of the program
          path.node.body.push(...state.items);
        },
      },

      JSXAttribute(path /*: any */, state /*: State */) {
        if (path.node.name.name !== 'css') {
          // Don't do anything if we didn't find an attribute named 'css'
          return;
        }

        // Get all the bindings in the program scope
        const { bindings } = path.findParent(p => p.type === 'Program').scope;

        if (state.required === 'pending') {
          // If we haven't inserted a require statement, now is the time
          if (bindings.styled) {
            // If the binding already exists, try to determine the library
            const { path: p } = bindings.styled;

            if (imports(t, p, true, 'linaria/react')) {
              state.required = 'linaria';
            } else if (imports(t, p, false, 'styled-components')) {
              state.required = 'styled-components';
            } else {
              state.required = 'none';
            }
          } else {
            // The binding doesn't exist, we need to insert the require
            let library;

            if (target === 'auto') {
              const message =
                "Please specify the name of one of these libraries in the 'target' option: 'linaria', 'styled-components'.\n" +
                "If you don't want to insert 'require' statement from  'styled', set the target to 'none'.";

              let dependencies;

              try {
                // Read the package.json to determine the library
                /* $FlowFixMe */
                dependencies = require(join(process.cwd(), 'package.json'))
                  .dependencies;
              } catch (e) {
                throw path.buildCodeFrameError(
                  "Couldn't read 'package.json' to determine the CSS in JS library.\n" +
                    message
                );
              }

              if (dependencies && dependencies.linaria) {
                library = 'linaria';
              } else if (dependencies && dependencies['styled-components']) {
                library = 'styled-components';
              } else {
                throw path.buildCodeFrameError(
                  "Couldn't find 'linaria' or 'styled-components' in the 'package.json'.\n" +
                    message
                );
              }
            } else {
              library = target;
            }

            if (library === 'linaria') {
              // Insert `var styled = require('linaria/react').styled`
              state.required = library;
              state.items.push(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('styled'),
                    t.memberExpression(
                      t.callExpression(t.identifier('require'), [
                        t.stringLiteral('linaria/react'),
                      ]),
                      t.identifier('styled')
                    )
                  ),
                ])
              );
            } else if (library === 'styled-components') {
              // Insert `var styled = require('styled-components')`
              state.required = library;
              state.items.push(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('styled'),
                    t.callExpression(t.identifier('require'), [
                      t.stringLiteral('styled-components'),
                    ])
                  ),
                ])
              );
            } else {
              state.required = 'none';
            }
          }
        }

        const elem = path.parentPath;
        const id = path.scope.generateUidIdentifier(
          'CSS' +
            elem.node.name.name.replace(/^([a-z])/, (match, p1) =>
              p1.toUpperCase()
            )
        );

        const tag = elem.node.name.name;
        const styled = t.callExpression(t.identifier('styled'), [
          /^[a-z]/.test(tag) ? t.stringLiteral(tag) : t.identifier(tag),
        ]);

        let css;

        if (t.isStringLiteral(path.node.value)) {
          css = t.templateLiteral(
            [t.templateElement({ raw: path.node.value.value }, true)],
            []
          );
        } else if (t.isJSXExpressionContainer(path.node.value)) {
          if (t.isTemplateLiteral(path.node.value.expression)) {
            css = path.node.value.expression;
          } else {
            css = t.templateLiteral(
              [
                t.templateElement({ raw: '' }, false),
                t.templateElement({ raw: '' }, true),
              ],
              [path.node.value.expression]
            );
          }
        }

        if (!css) {
          return;
        }

        elem.node.attributes = elem.node.attributes.filter(
          attr => attr !== path.node
        );
        elem.node.name.name = id.name;

        if (elem.parentPath.node.closingElement) {
          elem.parentPath.node.closingElement.name.name = id.name;
        }

        css.expressions = css.expressions.reduce((acc, ex) => {
          if (
            Object.entries(bindings).some(([, b] /*: any */) =>
              b.referencePaths.find(p => p.node === ex)
            ) ||
            t.isFunctionExpression(ex) ||
            t.isArrowFunctionExpression(ex)
          ) {
            acc.push(ex);
          } else {
            const name = path.scope.generateUidIdentifier(`_$p_`);
            const p = t.identifier('p');

            elem.node.attributes.push(
              t.jSXAttribute(
                t.jSXIdentifier(name.name),
                t.jSXExpressionContainer(ex)
              )
            );

            acc.push(
              t.arrowFunctionExpression([p], t.memberExpression(p, name))
            );
          }

          return acc;
        }, []);

        state.items.push(
          t.variableDeclaration('var', [
            t.variableDeclarator(id, t.taggedTemplateExpression(styled, css)),
          ])
        );
      },
    },
  };
};
