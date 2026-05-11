FROM node:18-alpine

WORKDIR /app

COPY shared-library/package*.json ./shared-library/
RUN cd shared-library && npm install

COPY shipping-service/package*.json ./shipping-service/
WORKDIR /app/shipping-service
RUN npm install

WORKDIR /app
COPY shared-library ./shared-library
COPY shipping-service/src ./shipping-service/src
COPY shipping-service/tsconfig.json ./shipping-service/

WORKDIR /app/shipping-service
RUN npm install file:../shared-library
RUN npm run build

EXPOSE 3005

CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]
