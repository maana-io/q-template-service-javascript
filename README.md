# Node-based Maana Knowledge Microservice Template

## Layout

TODO

## Customization

* Change the name and description of the module

In `package.json`, edit the metadata:

```json
{
  "name": "sample",
  "author": "Acme, Inc.",
  "license": "MIT",
  "version": "1.0.0",
  "description": "Awesome Bot",
  "main": "src/server.js",
  "repository": "https://github.com/acme-inc/awesome-bot.git",
```

* Edit the `.env` file to reflect proper `PORT`, `SERVICE_ID`, and other service-specific parameters.
* Define your public-facing schema in folders under the GraphQL subfolder as a schema file (.gql) and a resolver (.js).

## Build setup

TODO

## Server setup

TODO

### Timeouts

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

### Authentication
Authentication is handled against a Maana Q instance using a 'client credentials grant' OAuth flow.
The .env.template file contains the variables that must be configured:

- `REACT_APP_PORTAL_AUTH_PROVIDER` must be set to either `keycloak` or `auth0`.
- `REACT_APP_PORTAL_AUTH_DOMAIN` is the HTTP domain for the auth server. When setting this value, it is expected that keycloak domains are prefixed with an `https://`, and Auth0 domains are not, e.g. `maana.auth0.com`.
- `REACT_APP_PORTAL_AUTH_CLIENT_ID` is client ID being used in the auth server. 
- `REACT_APP_PORTAL_AUTH_CLIENT_SECRET` is the secret that corresponds to the `REACT_APP_PORTAL_AUTH_CLIENT_ID` value.
- `REACT_APP_PORTAL_AUTH_IDENTIFIER` is used both as the keycloak realm or auth0 domain name, as well as the OAuth audience value, therefore these must already have been configured as the same value on the server. 

## Deployment

TODO

## Logging

In some attempt to provide coherent and standard logging, I developed at least a funnel through which we could eventually connect proper logging. (There are several good ones, but we need to coordinate our selection with the containerization and deployment models involved.)

But instead of adding 'console.log', it is suggested to use the `io.maana.shared` utility: `log` [(source code)](/repo/ksvcs/packages/maana-shared/src/log.js), which provides a simple wrapper providing:

* a uniform log output format
  * module identity: `id`
  * time?
  * level (`info`,`warn`,`error`)
  * formatted values and indicators
* semantic argument formatters
  * module identity: `id`
  * `external` data (e.g., names)
  * `internal` data (e.g., uuids)
  * `info` data (i.e., values)
  * `true` and `false` and `bool` values
  * `json` objects
* colorization using [chalk](https://github.com/chalk/chalk)

### Setup

At the top of your `.js` file:

```javascript
import { log, print } from 'io.maana.shared'

// Module identity (whoami)
const SELF = (process.env.SERVICE_ID || 'io.maana.portal') + '.pubsub'
```

This is boilerplate for all Maana knowledge Services.

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

# Deploying the Service

## Prerequisits

You need to have Docker installed and running on your machine.

## Log into the Azure Container Registery

    docker login --username [USER_NAME] --password [PASSWORD] [ACR_NAME].azurecr.io

## Build and tag the Docker image

    docker build --tag=[ACR_NAME].azurecr.io/[SERVICE_NAME]:[VERSION]

Make sure you assign a _unique_ name and version to your image.

## Push your image into ACR

    docker push [ACR_NAME].azurecr.io/[SERVICE_NAME]:[VERSION]

## Run an instance of your application

1. In the ACR interface in the Azure Portal, click on `Reposetories`
2. Click on the name of your image. The version tag of your image will appear.
3. Click on the elipses (...) on the right side of the version tag.
4. Click on "Run Instance"
5. Provide the required information to spin up the instance. You'll be required to provide a name, resource group and port. The port should match the one used in your Dockerfile (8050)
