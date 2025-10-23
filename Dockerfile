# Étape 1 : Build de l'application
FROM node:20-alpine AS builder

# Crée un dossier de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm ci

# Copie du reste du code source
COPY . .

# Build en mode production
RUN npm run build

# Étape 2 : Image finale pour exécution
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8888

# Copie les fichiers nécessaires depuis le builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copie ton .env si tu veux l’intégrer dans l’image (optionnel)
# COPY .env .env

# Expose le port externe
EXPOSE 8888

# Commande de démarrage
CMD ["npm", "start"]
