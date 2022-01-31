import { typeDefs as Info, resolver as InfoResolver } from './graphql/Info';
import { typeDefs as Person, resolver as PersonResolver } from './graphql/Person';

import { makeExecutableSchema } from '@graphql-tools/schema';

export const schema = makeExecutableSchema({
  typeDefs: [Info, Person],
  resolvers: [InfoResolver, PersonResolver],
});
