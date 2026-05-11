FROM node:18-alpine

WORKDIR /app

COPY shared-library/package*.json ./shared-library/
RUN cd shared-library && npm install

COPY api-gateway/package*.json ./api-gateway/
WORKDIR /app/api-gateway
RUN npm install

WORKDIR /app
COPY shared-library ./shared-library
COPY api-gateway/src ./api-gateway/src
COPY api-gateway/tsconfig.json ./api-gateway/

WORKDIR /app/api-gateway
RUN npm install file:../shared-library
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]
