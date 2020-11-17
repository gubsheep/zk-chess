FROM node:12-stretch as build

RUN apt-get install make gcc g++ python

COPY client/yarn.lock client/yarn.lock
COPY client/package.json client/package.json

RUN cd client && yarn install
COPY client client
RUN cd client && yarn build

FROM node:12-stretch
COPY --from=build client/dist client/dist

COPY webserver webserver
RUN cd webserver && yarn
RUN cd webserver && yarn run pm2 install typescript

CMD cd webserver && NODE_ENV="production" yarn run start:prod
