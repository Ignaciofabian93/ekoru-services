import { GraphQLScalarType, Kind, type ValueNode } from 'graphql';

const ECMA_404 =
  'http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf';

/** A JSON value written inline in a query, read the way graphql-scalars read it. */
function parseLiteral(
  ast: ValueNode,
  variables?: Record<string, unknown> | null,
): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.OBJECT:
      return Object.fromEntries(
        ast.fields.map((field) => [
          field.name.value,
          parseLiteral(field.value, variables),
        ]),
      );
    case Kind.LIST:
      return ast.values.map((value) => parseLiteral(value, variables));
    case Kind.VARIABLE:
      return variables ? variables[ast.name.value] : undefined;
    default:
      return null;
  }
}

/**
 * Any JSON value: the same name, description and behaviour as graphql-scalars'
 * GraphQLJSON, which was the only thing used from that package. Dropping the
 * package clears GHSA-x8rm-f576-gq67 without its 2.x major (INF-22).
 */
export const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: `The \`JSON\` scalar type represents JSON values as specified by [ECMA-404](${ECMA_404}).`,
  specifiedByURL: ECMA_404,
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
});
