FROM node:18-alpine

WORKDIR /app

COPY shared-library/package*.json ./shared-library/
RUN cd shared-library && npm install

COPY order-service/package*.json ./order-service/
WORKDIR /app/order-service
RUN npm install

WORKDIR /app
COPY shared-library ./shared-library
COPY order-service/src ./order-service/src
COPY order-service/tsconfig.json ./order-service/

WORKDIR /app/order-service
RUN npm install file:../shared-library
RUN npm run build

EXPOSE 3002

CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]
