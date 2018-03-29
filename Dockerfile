FROM node:boron
LABEL Description="Posts news into the provided GroupMe chat" \
Vendor="Krakenfall" Version="1.0"

ARG API_PORT=9002

RUN mkdir -p /bot/app
WORKDIR /bot/app

COPY package.json /bot/app
RUN npm install
RUN npm install nano
RUN export TERM=xterm

COPY . /bot/app

RUN export TZ=America/Los_Angeles

EXPOSE $API_PORT

CMD ["npm", "start"]
