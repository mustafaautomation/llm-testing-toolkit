FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

RUN adduser --disabled-password --gecos '' llmuser && chown -R llmuser:llmuser /app
USER llmuser

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["run"]
