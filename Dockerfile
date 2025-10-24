# Étape 1 : Build Next.js
FROM node:20-slim AS builder

# Installer dépendances système (Prisma + OpenSSL)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Répertoire de travail
WORKDIR /app

# Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package*.json ./
COPY prisma ./prisma

# Forcer Prisma à utiliser le moteur JS compatible
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
ENV PRISMA_CLI_ENGINE_BINARY_TYPE=library

# Installer toutes les dépendances (dev incluses pour le build)
RUN npm install --include=dev

# Générer le client Prisma (avec le moteur JS)
RUN npx prisma generate

# Copier le reste du projet
COPY . .

# Construire l'application Next.js
RUN npx next build

# Étape 2 : Image finale allégée
FROM node:20-slim AS runner

# Installer OpenSSL (requis par Prisma à l’exécution)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Répertoire de travail
WORKDIR /app

# Variables d'environnement
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
ENV PRISMA_CLI_ENGINE_BINARY_TYPE=library

# Copier uniquement les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Exposer le port utilisé par Next.js
EXPOSE 8888

# Démarrer le serveur Next.js
CMD ["npm", "start"]
