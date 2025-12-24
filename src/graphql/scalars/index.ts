import { Scalar, CustomScalar } from "@nestjs/graphql";
import { DateTimeResolver } from "graphql-scalars";
import { ValueNode } from "graphql";

@Scalar("DateTime")
export class DateTimeScalar implements CustomScalar<Date, Date> {
  description = "Date custom scalar type";

  parseValue(value: unknown): Date {
    return DateTimeResolver.parseValue(value);
  }

  serialize(value: unknown): Date {
    return DateTimeResolver.serialize(value);
  }

  parseLiteral(ast: ValueNode): Date {
    return DateTimeResolver.parseLiteral(ast, {});
  }
}

// Re-export GraphQLJSON from graphql-scalars
export { GraphQLJSON } from "graphql-scalars";
