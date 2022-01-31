import { ApolloServer } from 'apollo-server';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';

import { schema } from './schema';

const server = new ApolloServer({
  schema,
});

server.listen(process.env.PORT || 3000).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
