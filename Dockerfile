FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=production DATABASE_PATH=/data/abasto.sqlite COOKIE_SECURE=true
RUN npm run build
VOLUME /data
EXPOSE 3000
CMD ["npm","run","start"]
