# babel-plugin-css-prop

Babel plugin to transpile `css` prop to a styled component.

The plugin will let you use the `css` prop ala [`emotion`](https://emotion.sh/) in libraries like [`linaria`](https://github.com/callstack/linaria) and [`styled-components`](https://www.styled-components.com/). Internally, it will convert the `css` prop to a styled component.

## Usage

Install the plugin:

```sh
yarn add --dev babel-plugin-css-prop
```

Then include it in your `.babelrc`:

```json
{
  "plugins": ["css-prop"]
}
```

## Example

Now you can use the `css` prop in your components:

```js
function App(props) {
  return (
    <div
      css={`
        flex: 1;
        background-color: ${props.bg};
      `}
    >
      Hello world
    </div>
  );
}
```

You are not restricted to template literals in the `css` prop. You can also use a plain string.

The only restrictions are:

1. The prop must be specified directly on the JSX element, since the plugin uses it to detect the prop.
2. The element using the `css` prop must be inside a component/function and not in the top level scope.

## Options

- `target: "linaria" | "styled-components" | "auto" | "none"`: The CSS-in-JS library you use. If you specify the library, the plugin will auto-insert a require statement for `styled` when needed. If you set it to `"auto"`, it will try to auto-detect which library you use by reading your `package.json`. If you set it to `"none"`, require statements won't be inserted. (Default: `"auto"`)
