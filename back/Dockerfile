FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx tsc

# RDS の CA バンドル（certs/rds-global-bundle.pem）を Node 全体の信頼ストアにも追加する。
# pg には src/db/ssl.ts で ca を渡しているが、DATABASE_URL に sslmode 等が付いていると
# pg はそちらの ssl 設定で上書きして ca を捨てるため、その場合でも検証が通るようにしておく。
ENV NODE_EXTRA_CA_CERTS=/app/certs/rds-global-bundle.pem

EXPOSE 8080

CMD ["node", "dist/server.js"]
