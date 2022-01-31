FROM node:14-alpine

WORKDIR /app

COPY package*.json /app

RUN npm install
RUN npm build

COPY . /app

CMD npm start

EXPOSE 8050
