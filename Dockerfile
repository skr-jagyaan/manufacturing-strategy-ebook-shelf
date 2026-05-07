FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --production

FROM node:18-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
