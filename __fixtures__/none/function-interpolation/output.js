const borderRadius = 10;

function App(props) {
  return <_CSSDiv>
      Hello world
    </_CSSDiv>;
}

var _CSSDiv = styled("div")`
        color: ${p => p.theme.accent};
      `;
