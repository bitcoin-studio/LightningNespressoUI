FROM openfaas/of-watchdog:0.7.7 as watchdog
FROM node:14-alpine as ship

WORKDIR /home/app/

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog
RUN addgroup -S app && adduser -S -g app app
RUN npm i -g typescript

COPY package.json ./
RUN npm i
COPY --chown=app:app . .
RUN tsc -p ./tsconfig.json && rm -r ./*.ts

USER app

ENV NPM_CONFIG_LOGLEVEL warn
ENV fprocess="node index.js"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:4000"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]