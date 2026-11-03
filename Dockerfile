FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

VOLUME ["/app/data"]
EXPOSE 3000

CMD ["npm", "start"]
