FROM node:18-alpine

WORKDIR /app

COPY shared-library/package*.json ./shared-library/
RUN cd shared-library && npm install

COPY inventory-service/package*.json ./inventory-service/
WORKDIR /app/inventory-service
RUN npm install

WORKDIR /app
COPY shared-library ./shared-library
COPY inventory-service/src ./inventory-service/src
COPY inventory-service/tsconfig.json ./inventory-service/

WORKDIR /app/inventory-service
RUN npm install file:../shared-library
RUN npm run build

EXPOSE 3003

CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]
