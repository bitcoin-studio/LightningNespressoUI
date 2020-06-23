FROM node:14-alpine
WORKDIR /home/app/
RUN npm i -g typescript

COPY package.json ./
RUN npm i
COPY --chown=node:node . .
RUN tsc -p ./tsconfig.json && rm -r ./*.ts

USER node
RUN touch /tmp/.lock
EXPOSE 8080
CMD ["node", "index.js"]