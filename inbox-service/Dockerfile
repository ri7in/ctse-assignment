FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src/ ./src/
COPY swagger/ ./swagger/
EXPOSE 3005
USER node
CMD ["node", "src/app.js"]
