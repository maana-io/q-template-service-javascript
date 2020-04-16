# NodeJs-based Maana Q Knowledge Microservice Template

This is a tempalate project for creating GraphQL endpoint optimized for Maana Q. It provides everything you need to quickly create a GraphQL schema, provide resolvers, dockerize, and deploy to a Kubernetes cluster.

## Layout

All source code is in `src/`.

GraphQL schema and resolvers are kept in separate directories under `src/graphql`.

## Customization

You should only need to worry about changing the `package.json` and `Dockerfile` descriptions and your GraphQL schema and resolvers. There should be **no need** to touch the `server.js`, `start.dev.js`, or `pubsub.js`, as these are configured to run the service and provide compatibility with Maana Q.

- Change the name and description of the module

In `package.json`, edit the metadata:

```json
{
  "name": "my-amazing-service",
  "author": "Acme, Inc.",
  "license": "MIT",
  "version": "1.0.0",
  "description": "My amazing service",
  "main": "src/server.js",
  "repository": "https://github.com/acme-inc/my-amazing-service.git",
```

- Edit the `.env` file to reflect proper `PORT`, `SERVICE_ID`, and other service-specific parameters.
- Define your public-facing schema in folders under the GraphQL subfolder as a schema file (.gql) and a resolver (.js).

## Local build and development

```bash
npm i
npm run dev
```

## Local docker build and execution

```bash
npm run docker-build
npm run docker-run
```

## Deploy

Use the Maana GraphQL CLI commands to deploy to your Maana Kubernetes cluster:

```bash
# Install the GraphQL CLI and Maana commands
npm i -g graphql-cli graphql-cli-maana

# Use the Maana deployment command and follow the interactive prompts
gql mdeploy
```

## Timeouts

Node has a default request timeout of 2 minutes. One way to override this is by using the `setTimout(msecs: number, callback?: () => void)` ([link](https://nodejs.org/api/http.html#http_response_settimeout_msecs_callback)) method on the response object when setting middleware for the Express server.

```javascript
const requestTimeout = 1200000 // 20 minutes
app.use((req, res, next) => {
  res.setTimeout(requestTimeout, () => {
    res.status(408)
    res.send('408: Request Timeout: Service aborted your connection')
  })
  next()
})

// Continue setting middleware
// ...

app.get('/', (req, res) => {
  // ...
})
```

## Authentication

Authentication is handled against a Maana Q instance using a 'client credentials grant' OAuth flow.

The .env.template file contains the variables that must be configured:

- `REACT_APP_PORTAL_AUTH_PROVIDER` must be set to either `keycloak` or `auth0`.
- `REACT_APP_PORTAL_AUTH_DOMAIN` is the HTTP domain for the auth server. When setting this value, it is expected that keycloak domains are prefixed with an `https://`, and Auth0 domains are not, e.g. `maana.auth0.com`.
- `REACT_APP_PORTAL_AUTH_CLIENT_ID` is client ID being used in the auth server.
- `REACT_APP_PORTAL_AUTH_CLIENT_SECRET` is the secret that corresponds to the `REACT_APP_PORTAL_AUTH_CLIENT_ID` value.
- `REACT_APP_PORTAL_AUTH_IDENTIFIER` is used both as the keycloak realm or auth0 domain name, as well as the OAuth audience value, therefore these must already have been configured as the same value on the server.

## Client Setup

In general, the preferred design pattern is to have pure functions provided by microservices in compositions. However, there are times where it is appropriate for one service to directly call another service as its client, thus forming more of a peer-to-peer network of services.

This template provides such a client setup for your convenience, as there is some nuance involved to properly deal with security. Simply specify the `CKG_ENDPOINT_URL` environment variable for the service you wish to call.

```
    info: async (_, args, { client }) => {
      try {
        const query = gql`
          query info {
            info {
              id
            }
          }
        `
        const {
          data: {
            info: { id }
          }
        } = await client.query({ query })

        return {
          id: 'e5614056-8aeb-4008-b0dc-4f958a9b753a',
          name: 'io.maana.template',
          description: `Maana Q Knowledge Service template using ${id}`
        }
      } catch (e) {
        console.log('Wxception:', e)
        throw e
      }
    },
```

### Location of the code

Maana's shared library gives you an easy way to setup an authenticated graphql client for making requests using the `BuildGraphqlClient` method. To see an example in the template open `src/server.js` and find the `clientSetup` function, it creates a GraphQL client with authentication built into it.

With the environment variables setup, then you can make calls to `client.query`, `client.mutate`, or `client.execute` to call the endpoint defined in `CKG_ENDPOINT_URL`. This client is also passed into the context for each request, and can be accessed in the resolvers using the context.

## Examples using the provided sample

### GraphiQL

(See `playground.graphql`)

```graphql
query info {
  info {
    id
    name
    version
    description
  }
}

mutation addPerson {
  addPerson(
    input: {
      id: 0
      givenName: "alice"
      familyName: "toklas"
      dateOfBirth: "April 30, 1877"
    }
  )
}

query allPeople {
  allPeople {
    id
    givenName
    familyName
    dateOfBirth
  }
}
```

### From JavaScript

```js
import gql from 'gql-tag'

const PersonNameQuery = gql`
  query($id: ID!) {
    person(id: $id) {
      name
    }
  }
`

const AddPersonMutation = gql`
  mutate($input: AddPersonInput!) {
    addPerson(input: $input)
  }
`

export const resolver = {
  Query: {
    user: async (root, { id }, context) => {
      // Using the client to call a query on an external GraphQL API
      return await context.client.query({
        query: PersonNameQuery,
        variables: { id },
      })
    },
  },
  Mutation: {
    addUser: async (root, { input }, context) => {
      // Using the client to call a mutation on an external GraphQL API
      return await context.client.mutate({
        mutation: AddPersonMutation,
        variables: { name: 'Some Persons Name' },
      })
    },
  },
}
```

## Logging

In some attempt to provide coherent and standard logging, I developed at least a funnel through which we could eventually connect proper logging. (There are several good ones, but we need to coordinate our selection with the containerization and deployment models involved.)

But instead of adding 'console.log', it is suggested to use the `io.maana.shared` utility: `log` [(source code)](/repo/ksvcs/packages/maana-shared/src/log.js), which provides a simple wrapper providing:

- a uniform log output format
  - module identity: `id`
  - time?
  - level (`info`,`warn`,`error`)
  - formatted values and indicators
- semantic argument formatters
  - module identity: `id`
  - `external` data (e.g., names)
  - `internal` data (e.g., uuids)
  - `info` data (i.e., values)
  - `true` and `false` and `bool` values
  - `json` objects
- colorization using [chalk](https://github.com/chalk/chalk)

### Examples

Instead of:

```javascript
console.log('Opening RedisPubSub Connection: %s %d', REDIS_ADDR, REDIS_PORT)
```

do:

```js
log(SELF).info(`Opening RedisPubSub Connection ${REDIS_ADDR} ${REDIS_PORT}`)
```

Or, if you wish to convey more meaning in your logging:

```javascript
log(SELF).info(
  `uploading ${print.external(req.uploadFileName)} to ${print.internal(
    req.uploadDir
  )}` + (partIndex ? ` part: ${print.info(partIndex)}` : '')
)
```
