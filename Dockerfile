FROM node:argon
LABEL Description="Posts news into the provided GroupMe chat" \
Vendor="Krakenfall" Version="1.0"

RUN mkdir -p /bot/app
WORKDIR /bot/app

COPY package.json /bot/app
RUN npm install

COPY . /bot/app

RUN export TZ=America/Los_Angeles

EXPOSE 80

CMD ["npm", "start"]
