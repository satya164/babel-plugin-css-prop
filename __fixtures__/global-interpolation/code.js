const borderRadius = 10;

function App(props) {
  return (
    <div
      css={`
        flex: 1;
        border-radius: ${borderRadius}px;
      `}
    >
      Hello world
    </div>
  );
}
