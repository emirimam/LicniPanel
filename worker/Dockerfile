FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

# .env se ne kopira u sliku - dolazi kroz --env-file ili compose.
CMD ["node", "src/index.js"]
