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
