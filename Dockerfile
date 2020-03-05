FROM node:alpine

RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

WORKDIR /app
ADD . .
RUN rm -fr node_modules
RUN yarn install

CMD yarn start