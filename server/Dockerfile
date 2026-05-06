FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev=false
COPY . .
EXPOSE 3000
CMD ["npx", "ts-node", "--project", "tsconfig.json", "--transpile-only", "index.ts"]
