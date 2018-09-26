/* @flow */

const { join } = require('path');
const syntax = require('@babel/plugin-syntax-jsx').default;

/*::
type State = {
  components: Array<{ id: any, value: any }>
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
          state.components = [];
        },

        exit(path /*: any */, state /*: State */) {
          if (!state.components.length) {
            return;
          }

          const bindings = path.scope.getAllBindings();

          if (!bindings.styled) {
            let library;

            if (target === 'auto') {
              const message =
                "Please specify the name of one of these libraries in the 'target' option: 'linaria', 'styled-components'.\n" +
                "If you don't want to insert 'require' statement from  'styled', set the target to 'none'.";

              let dependencies;

              try {
                /* $FlowFixMe */
                dependencies = require(join(process.cwd(), 'package.json'))
                  .dependencies;
              } catch (e) {
                throw new Error(
                  "Couldn't read 'package.json' to determine the CSS in JS library.\n" +
                    message
                );
              }

              if (dependencies && dependencies.linaria) {
                library = 'linaria';
              } else if (dependencies && dependencies['styled-components']) {
                library = 'styled-components';
              } else {
                throw new Error(
                  "Couldn't find 'linaria' or 'styled-components' in the 'package.json'.\n" +
                    message
                );
              }
            } else {
              library = target;
            }

            if (library === 'linaria') {
              path.node.body.push(
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
              path.node.body.push(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier('styled'),
                    t.callExpression(t.identifier('require'), [
                      t.stringLiteral('styled-components'),
                    ])
                  ),
                ])
              );
            }
          }

          const elems = state.components.map(c =>
            t.variableDeclaration('var', [t.variableDeclarator(c.id, c.value)])
          );

          path.node.body.push(...elems);
        },
      },

      JSXAttribute(path /*: any */, state /*: State */) {
        if (path.node.name.name !== 'css') {
          return;
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

        const { bindings } = path.findParent(p => p.type === 'Program').scope;

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

        state.components.push({
          id,
          value: t.taggedTemplateExpression(styled, css),
        });
      },
    },
  };
};
