FROM node:18-alpine

WORKDIR /app

COPY shared-library/package*.json ./shared-library/
RUN cd shared-library && npm install

COPY orchestrator-service/package*.json ./orchestrator-service/
WORKDIR /app/orchestrator-service
RUN npm install

WORKDIR /app
COPY shared-library ./shared-library
COPY orchestrator-service/src ./orchestrator-service/src
COPY orchestrator-service/tsconfig.json ./orchestrator-service/

WORKDIR /app/orchestrator-service
RUN npm install file:../shared-library
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]
