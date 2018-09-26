const borderRadius = 10;

function App(props) {
  return (
    <div
      css={`
        color: ${p => p.theme.accent};
      `}
    >
      Hello world
    </div>
  );
}
