//
// External imports
//

// routing engine
import express from 'express'
// middleware to allow cross-origin requests
import cors from 'cors'
// middleware to support GraphQL
import { ApolloServer } from 'apollo-server-express'
// GraphQL schema compilation
import { makeExecutableSchema } from 'graphql-tools'
// Keep GraphQL stuff nicely factored
import glue from 'schemaglue'
import path from 'path'
import http from 'http'
import request from 'request-promise-native'
import {
  log,
  print,
  initMetrics,
  counter,
  BuildGraphqlClient
} from 'io.maana.shared'
import querystring from 'querystring'
// load .env into process.env.*
require('dotenv').config()

const options = {
  mode: 'js' // default
  // ignore: '**/somefileyoudonotwant.js'
}
const schemaPath = path.join(
  '.',
  `${__dirname}`.replace(process.cwd(), ''),
  'graphql/'
)
const glueRes = glue(schemaPath, options)

// Compile schema
export const schema = makeExecutableSchema({
  typeDefs: glueRes.schema,
  resolvers: glueRes.resolver
})

//
// Client setup
// - allow this service to be a client of Maana Q's Computational Knowledge Graph
//
let client
const clientSetup = token => {
  if (!client) {
    // construct graphql client using endpoint and context
    client = BuildGraphqlClient(CKG_ENDPOINT_URL, (_, { headers }) => {
      // return the headers to the context so httpLink can read them
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : ''
        }
      }
    })
  }
}

//
// Server setup
//
// Our service identity
const SELF = process.env.SERVICE_ID || 'maana-service'

// HTTP port
const PORT = process.env.PORT

// HOSTNAME for subscriptions etc.
const HOSTNAME = process.env.HOSTNAME || 'localhost'

// External DNS name for service
const PUBLICNAME = process.env.PUBLICNAME || 'localhost'

// Remote (peer) services we use
const CKG_ENDPOINT_URL = process.env.CKG_ENDPOINT_URL

const app = express()

//
// CORS
//
const corsOptions = {
  origin: `http://${PUBLICNAME}:3000`,
  credentials: true // <-- REQUIRED backend setting
}

app.use(cors(corsOptions)) // enable all CORS requests
app.options('*', cors()) // enable pre-flight for all routes

app.get('/', (req, res) => {
  res.send(`${SELF}\n`)
})

const defaultSocketMiddleware = (connectionParams, webSocket) => {
  return new Promise(function(resolve, reject) {
    log(SELF).warn(
      'Socket Authentication is disabled. This should not run in production.'
    )
    resolve()
  })
}

initMetrics(SELF.replace(/[\W_]+/g, ''))
const graphqlRequestCounter = counter('graphqlRequests', 'it counts')

const initServer = async options => {
  const { httpAuthMiddleware, socketAuthMiddleware } = options

  const socketMiddleware = socketAuthMiddleware || defaultSocketMiddleware

  const server = new ApolloServer({
    schema,
    subscriptions: {
      onConnect: socketMiddleware
    },
    context: async ({ req }) => {
      return {
        client
      }
    }
  })

  server.applyMiddleware({
    app
  })

  const httpServer = http.createServer(app)
  server.installSubscriptionHandlers(httpServer)

  httpServer.listen({ port: PORT }, async () => {
    log(SELF).info(
      `listening on ${print.external(`http://${HOSTNAME}:${PORT}/graphql`)}`
    )

    // Create OIDC token URL for the specified auth provider (default to auth0).
    const tokenUri =
      process.env.REACT_APP_PORTAL_AUTH_PROVIDER === 'keycloak'
        ? `${process.env.REACT_APP_PORTAL_AUTH_DOMAIN}/auth/realms/${process.env.REACT_APP_PORTAL_AUTH_IDENTIFIER}/protocol/openid-connect/token`
        : `https://${process.env.REACT_APP_PORTAL_AUTH_DOMAIN}/oauth/token`

    const form = {
      grant_type: 'client_credentials',
      client_id: process.env.REACT_APP_PORTAL_AUTH_CLIENT_ID,
      client_secret: process.env.REACT_APP_PORTAL_AUTH_CLIENT_SECRET,
      audience: process.env.REACT_APP_PORTAL_AUTH_IDENTIFIER
    }
    const formData = querystring.stringify(form)
    const contentLength = formData.length
    const requestConfig = {
      headers: {
        'Content-Length': contentLength,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      uri: tokenUri,
      body: formData,
      method: 'POST'
    }
    const response = JSON.parse(await request(requestConfig))
    clientSetup(response.access_token)
  })
}

export default initServer
