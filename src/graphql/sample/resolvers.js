import { log, print } from 'io.maana.shared'

import { gql } from 'apollo-server-express'
import pubsub from '../../pubsub'
import uuid from 'uuid'

require('dotenv').config()

const SERVICE_ID = process.env.SERVICE_ID
const SELF = SERVICE_ID || 'io.maana.template'

// dummy in-memory store
const people = {}

// to use the CKG client in your resolver
// my_resolver: async (_, args, { client }) => {
//   try {
//     if (client) {
//       const query = gql`
//         query info {
//           info {
//             id
//           }
//         }
//       `
//       const {
//         data: {
//           info: { id }
//         }
//       } = await client.query({ query })
//     }
//   } catch (e) {
//     log(SELF).error(
//       `Resolver failed with Exception: ${e.message}\n${print.external(
//         e.stack
//       )}`
//     )
//   }
// }

export const resolver = {
  Query: {
    allPeople: async () => Object.values(people),
    person: async (_, { id }) => people[id],
  },
  Mutation: {
    addPerson: async (_, { input }) => {
      if (!input.id) {
        input.id = uuid.v4()
      }
      people[input.id] = input
      pubsub.publish('personAdded', { personAdded: input })
      return input.id
    },
  },
  Subscription: {
    personAdded: {
      subscribe: (parent, args, ctx, info) =>
        pubsub.asyncIterator('personAdded'),
    },
  },
}
