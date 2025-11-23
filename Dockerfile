# syntax=docker/dockerfile:1.6
FROM node:20-bullseye

WORKDIR /app

# Only copy package manifests for better layer caching
COPY package.json ./
COPY contracts/package.json ./contracts/
COPY services/compliance-engine/package.json ./services/compliance-engine/
COPY services/oracle-mock/package.json ./services/oracle-mock/
COPY dashboard/package.json ./dashboard/
COPY wallet/package.json ./wallet/

RUN npm install

# Bring in the full source tree
COPY . .

ENV NODE_ENV=development \
    HOST=0.0.0.0

EXPOSE 8545 4001 4002 5173 5174

CMD ["npm", "run", "dev"]
