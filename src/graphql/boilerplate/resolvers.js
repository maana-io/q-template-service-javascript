import pkg from '../../../package.json'

export const resolver = {
  Query: {
    info: async (_, args, { client }) => ({
      id: `${pkg.name}:${pkg.version}`,
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
    }),
  },
}
