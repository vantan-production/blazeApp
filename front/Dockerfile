FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install

# 開発用（docker-compose.yml が使う）。ソースはボリュームでマウントし、next dev でホットリロードする
FROM base AS dev

EXPOSE 3000

CMD ["npm", "run", "dev"]

# 本番用（docker build --target prod）
FROM base AS prod

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
