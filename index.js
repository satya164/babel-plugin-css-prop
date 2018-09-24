/* @flow */

const syntax = require('@babel/plugin-syntax-jsx').default;

/*::
type State = {
  components: Array<{ id: any, value: any }>
}
*/

module.exports = function(babel /*: any */) {
  const { types: t } = babel;

  return {
    inherits: syntax,

    visitor: {
      Program: {
        enter(path /*: any */, state /*: State */) {
          state.components = [];
        },

        exit(path /*: any */, state /*: State */) {
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
