FROM node:18-alpine

WORKDIR /app

COPY shared-library/package*.json ./shared-library/
RUN cd shared-library && npm install

COPY payment-service/package*.json ./payment-service/
WORKDIR /app/payment-service
RUN npm install

WORKDIR /app
COPY shared-library ./shared-library
COPY payment-service/src ./payment-service/src
COPY payment-service/tsconfig.json ./payment-service/

WORKDIR /app/payment-service
RUN npm install file:../shared-library
RUN npm run build

EXPOSE 3004

CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]
