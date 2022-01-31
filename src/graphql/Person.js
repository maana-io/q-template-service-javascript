import { gql } from 'apollo-server';
import uuid from 'uuid';

require('dotenv').config();

const SERVICE_ID = process.env.SERVICE_ID;
const SELF = SERVICE_ID || 'io.maana.template';

// schema definition
export const typeDefs = gql`
  # Custom Types
  type Person {
    # Kind fields
    id: ID! # internal identifier (unique)
    name: String # external identifier (non-unique)
    givenName: String
    familyName: String
    dateOfBirth: Date
  }

  # Custom Inputs
  input PersonInput {
    id: ID # if known, otherwise one will be generated
    name: String
    givenName: String
    familyName: String
    dateOfBirth: Date
  }

  # Query Root
  type Query {
    # Custom queries
    allPeople: [Person!]!
    person(id: ID!): Person
  }

  # Mutation Root
  type Mutation {
    # Custom mutations
    addPerson(input: PersonInput): ID
    updatePerson(input: PersonInput): ID
    deletePerson(id: ID!): Person
  }

  # Custom Event Types
  type PersonEvent {
    id: ID
    name: String
    givenName: String
    familyName: String
    dateOfBirth: Date
  }
`;

// dummy in-memory store
const people = {};

export const resolver = {
  Query: {
    allPeople: async () => Object.values(people),
    person: async (_, { id }) => people[id],
  },
  Mutation: {
    addPerson: async (_, { input }) => {
      if (!input.id) {
        input.id = uuid.v4();
      }
      people[input.id] = input;
      return input.id;
    },
  },
};
