import uuid from 'uuid'
import pubsub from '../../pubsub'
import { gql } from 'apollo-server-express'

import { log, print } from 'io.maana.shared'

require('dotenv').config()

const SELF = process.env.SERVICE_ID || 'io.maana.template'

// dummy in-memory store
const people = {}

export const resolver = {
  Query: {
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
    allPeople: async () => Object.values(people),
    person: async (_, { id }) => people[id]
  },
  Mutation: {
    addPerson: async (_, { input }) => {
      if (!input.id) {
        input.id = uuid.v4()
      }
      people[input.id] = input
      pubsub.publish('personAdded', { personAdded: input })
      return input.id
    }
  },
  Subscription: {
    personAdded: {
      subscribe: (parent, args, ctx, info) =>
        pubsub.asyncIterator('personAdded')
    }
  }
}
