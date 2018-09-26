const {
  styled
} = require("linaria/react");

function App(props) {
  return <_CSSDiv>
      Hello world
    </_CSSDiv>;
}

var _CSSDiv = styled("div")`flex: 1`;
