const letterRegex = /^[A-Za-z]+$/;
const whiteSpaceRegex = /\s/;

const lexer = (input) => {
  const tokens = [];
  let position = 0;

  while (position < input.length) {
    let character = input[position];

    if (letterRegex.test(character)) {
      let value = "";

      while (letterRegex.test(character)) {
        value += character;
        character = input[++position];
      }

      if (value === "fn") {
        tokens.push({
          type: "function declaration",
          value,
        });
      } else {
        tokens.push({
          type: "identifier",
          value,
        });
      }
      continue;
    }

    if (whiteSpaceRegex.test(character)) {
      position++;
      continue;
    }

    if (character === "(" || character === ")") {
      tokens.push({
        type: "paren",
        value: character,
      });
      position++;
      continue;
    }

    if (character === "{" || character === "}") {
      tokens.push({
        type: "brace",
        value: character,
      });
      position++;
      continue;
    }

    throw new Error(`Error compiling value: '${character}'`);
  }

  return tokens;
};

const parser = (tokens) => {
  let position = 0;

  const walk = () => {
    let token = tokens[position];

    if (token.type === "function declaration") {
      token = tokens[++position];

      const node = {
        type: "FunctionDeclaration",
        name: token.value,
        params: [],
        body: [],
      };

      position += 2;
      token = tokens[position];

      while (token.value !== ")") {
        node.params.push(walk());
        token = tokens[position];
        position++;
      }

      token = tokens[++position];

      while (token.value !== "}") {
        node.body.push(walk());
        token = tokens[position];
        position++;
      }

      return node;
    }

    if (token.type === "identifier") {
      position++;
      const node = {
        type: "Identifier",
        value: token.value,
      };
      return node;
    }

    throw new TypeError(`Unknown token type: '${token.type}'`);
  };

  const ast = {
    type: "Program",
    body: [walk()],
  };

  return ast;
};

const transformer = (ast) => {
  const transformedAst = {
    type: "Program",
    body: [],
  };
  let nodePosition = transformedAst.body;

  const NODE_TRANSFORMERS = {
    FunctionDeclaration(node) {
      const transformedNode = {
        type: "FunctionDeclaration",
        id: {
          type: "Identifier",
          name: node.name,
        },
        params: [],
        body: [],
      };
      nodePosition.push(transformedNode);
      nodePosition = transformedNode.params;
    },
    Identifier(node) {
      const transformedNode = {
        type: "Identifier",
        name: node.value,
      };
      nodePosition.push(transformedNode);
    },
  };

  const transform = (node, parent) => {
    const mapper = NODE_TRANSFORMERS[node.type];

    if (mapper) mapper(node, parent);

    if (node.type === "Program") {
      node.body.forEach((childNode) => transform(childNode, node));
    }

    if (node.type === "FunctionDeclaration") {
      node.params.forEach((childNode) => transform(childNode, node));
      node.body.forEach((childNode) => transform(childNode, node));
    }
  };

  transform(ast, null);

  return transformedAst;
};

const generator = (node) => {
  if (node.type === "Program") {
    return node.body.map((childNode) => generator(childNode)).join("\n");
  }

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "FunctionDeclaration") {
    return `function ${generator(node.id)}(${node.params
      .map((paramNode) => generator(paramNode))
      .join(",")}){${node.body.map((bodyNode) => generator(bodyNode))}}`;
  }
};

const compiler = (input) => {
  const tokens = lexer(input);
  const ast = parser(tokens);
  const transformedAst = transformer(ast);
  const generatedCode = generator(transformedAst);

  return generatedCode;
};

const input = "fn test(arg){}";

console.log(compiler(input));
