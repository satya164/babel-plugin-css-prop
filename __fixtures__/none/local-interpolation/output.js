function App(props) {
  return <_CSSDiv _$p_={props.bg}>
      Hello world
    </_CSSDiv>;
}

var _CSSDiv = styled("div")`
        flex: 1;
        background-color: ${p => p._$p_};
      `;
