# Build context deve ser a raiz do projeto (ver docker-compose.yml)
FROM node:20-alpine
WORKDIR /app/server

# Dependências de produção
COPY server/package*.json ./
RUN npm ci --omit=dev

# Código do servidor
COPY server/ .

# Arquivos de dados do frontend que o seed importa em runtime
COPY src/data/ /app/src/data/

EXPOSE 3000
CMD ["node", "server.js"]
