import { gql } from 'apollo-server';
import pkg from '../../package.json';

export const typeDefs = gql`
  # Scalars
  scalar Date
  scalar JSON

  # Boilerplate
  type Info {
    id: ID!
    name: String!
    version: String!
    description: String
  }

  # Query Root
  type Query {
    # Boilerplate
    info: Info
  }
`;

export const resolver = {
  Query: {
    info: async (_, args, { client }) => ({
      id: `${pkg.name}:${pkg.version}`,
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
    }),
  },
};
