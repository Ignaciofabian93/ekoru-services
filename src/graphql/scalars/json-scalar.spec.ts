import { parseValue } from 'graphql';
import { GraphQLJSON } from './index.js';

const literal = (source: string, variables?: Record<string, unknown>) =>
  GraphQLJSON.parseLiteral(parseValue(source), variables);

describe('GraphQLJSON', () => {
  it('keeps the name and description clients and the gateway already know', () => {
    expect(GraphQLJSON.name).toBe('JSON');
    expect(GraphQLJSON.description).toContain('ECMA-404');
  });

  it('passes variables and results through unchanged', () => {
    const value = { street: 'Av. Siempre Viva', floor: 3, tags: ['a'] };
    expect(GraphQLJSON.parseValue(value)).toBe(value);
    expect(GraphQLJSON.serialize(value)).toBe(value);
  });

  it('reads inline objects, lists, numbers, booleans and nulls', () => {
    expect(
      literal(
        '{ address: "Calle 1", floor: 3, area: 12.5, ok: true, notes: null, tags: ["a", "b"] }',
      ),
    ).toEqual({
      address: 'Calle 1',
      floor: 3,
      area: 12.5,
      ok: true,
      notes: null,
      tags: ['a', 'b'],
    });
  });

  it('reads variables nested in an inline object', () => {
    expect(literal('{ city: $city }', { city: 'Santiago' })).toEqual({
      city: 'Santiago',
    });
  });
});
