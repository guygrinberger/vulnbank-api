FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

EXPOSE 7777

CMD ["npx", "ts-node", "src/index.ts"]
