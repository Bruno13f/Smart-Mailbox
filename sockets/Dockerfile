# Usa imagem oficial do Node.js
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas os arquivos necessários da pasta src/
COPY src/package*.json ./

# Instala dependências
RUN npm install

# Copia o restante dos arquivos da pasta src/
COPY src/ .

# Expõe a porta do WebSocket
EXPOSE 8080

# Comando para iniciar o servidor
CMD ["node", "server.js"]
