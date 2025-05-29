# Usa a imagem oficial do Bun
FROM oven/bun

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os ficheiros do diretório local src/ para o container
COPY src/ ./src/
COPY .env .env

# Copia os ficheiros de configuração necessários para o root do container
COPY src/package.json src/bun.lock src/tsconfig.json ./

# Instala as dependências com Bun
RUN bun install

# Expõe a porta que a API vai usar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["bun", "src/index.ts"]
