#!/bin/bash
set -e

# Nom du projet / conteneur
APP_NAME="zagency-lgdp"
PORT=8888
ENV_FILE=".env"
DOCKERFILE="Dockerfile"

echo "🔧 Correction du problème réseau Docker..."
# Ajout de DNS fiables si nécessaire
if [ -f /etc/docker/daemon.json ]; then
    sudo jq '.dns = ["8.8.8.8", "1.1.1.1"]' /etc/docker/daemon.json | sudo tee /etc/docker/daemon.json > /dev/null
    echo "✅ DNS mis à jour (8.8.8.8 / 1.1.1.1)"
else
    echo "ℹ️ Aucun fichier daemon.json détecté, passage à l’étape suivante..."
fi

echo "♻️ Nettoyage du cache Docker..."
docker builder prune -af >/dev/null 2>&1 || true

echo "🧱 Construction de l'image Docker..."
docker build --no-cache -t $APP_NAME -f $DOCKERFILE .

echo "🧹 Suppression d'un conteneur précédent s'il existe..."
docker rm -f $APP_NAME >/dev/null 2>&1 || true

echo "🚀 Lancement du conteneur..."
docker run -d \
  --name $APP_NAME \
  -p $PORT:$PORT \
  --env-file $ENV_FILE \
  $APP_NAME

echo ""
echo "✅ Application lancée avec succès !"
echo "🌐 Accès : http://localhost:$PORT"
echo ""
docker ps --filter "name=$APP_NAME"
