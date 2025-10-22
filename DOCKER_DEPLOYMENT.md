# Docker Deployment Guide - Zagency

Ce guide explique comment déployer l'application Zagency en production avec Docker.

## 📋 Prérequis

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Accès à une base de données MySQL (locale ou distante)

## 📁 Fichiers créés

- **Dockerfile** - Multi-stage build optimisé pour la production
- **docker-compose.yml** - Configuration basique pour un déploiement simple
- **docker-compose.prod.yml** - Configuration avancée pour la production
- **.dockerignore** - Fichiers à exclure du build
- **.env.production** - Template des variables d'environnement

## 🚀 Déploiement rapide

### 1. Préparer les variables d'environnement

```bash
# Copier le template
cp .env.production .env.prod

# Éditer avec vos vraies valeurs
nano .env.prod
```

**Variables requises** :
- `DATABASE_URL` - URL de connexion MySQL
- `NEXTAUTH_URL` - URL publique de votre app (ex: https://zagency.com)
- `NEXTAUTH_SECRET` - Clé secrète forte (générer avec: `openssl rand -base64 32`)

### 2. Lancer avec docker-compose (simple)

```bash
# Démarrer l'application
docker-compose --env-file .env.prod up -d

# Vérifier les logs
docker-compose logs -f app

# Arrêter
docker-compose down
```

### 3. Lancer avec docker-compose.prod.yml (recommandé)

```bash
# Démarrer
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Vérifier l'état
docker-compose -f docker-compose.prod.yml ps

# Logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## 🐳 Commandes utiles

```bash
# Construire l'image
docker build -t zagency:latest .

# Vérifier l'image
docker images | grep zagency

# Lancer manuellement un conteneur
docker run -p 3000:3000 \
  --env-file .env.prod \
  -d \
  --name zagency-app \
  zagency:latest

# Accéder au conteneur
docker exec -it zagency-app sh

# Voir les logs
docker logs -f zagency-app

# Arrêter et supprimer
docker stop zagency-app
docker rm zagency-app
```

## 📊 Architecture du Dockerfile

**Stage 1 (Builder)**
- Node.js Alpine base
- Installation des dépendances
- Génération du client Prisma
- Build Next.js

**Stage 2 (Runner)**
- Image Node.js Alpine optimisée (plus légère)
- Copie du build uniquement
- Utilisateur non-root pour la sécurité
- Health check intégré
- dumb-init pour la gestion des signaux

**Avantages** :
- Image finale ~300MB au lieu de 800MB+
- Pas de code source exposé
- Sécurité renforcée
- Démarrage rapide

## 🔒 Sécurité en production

### Checklist

- [ ] `NEXTAUTH_SECRET` - Générer une clé forte (`openssl rand -base64 32`)
- [ ] `DATABASE_URL` - Utiliser un mot de passe fort
- [ ] `NEXTAUTH_URL` - Définir le bon domaine (HTTPS recommandé)
- [ ] Certificats SSL/TLS - Configurer avec un reverse proxy (nginx/traefik)
- [ ] Variables d'environnement - Ne jamais commiter `.env.prod`

### Avec Nginx (reverse proxy)

```bash
# Ajouter au docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - zagency-network
```

## 📈 Performance et monitoring

### Ressources

Le docker-compose.prod.yml limite les ressources :
- **CPU** : 1 core réservé, max 2 cores
- **RAM** : 1GB réservé, max 2GB

À ajuster selon vos besoins.

### Health Check

L'application inclut un health check qui :
- Effectue une requête HTTP toutes les 30 secondes
- Redémarre le conteneur après 3 échecs consécutifs
- Attend 40 secondes au démarrage avant le premier test

### Logs

Les logs sont configurés avec rotation :
- Taille max : 50MB par fichier
- Conservation : 5 fichiers
- Dossier : `./logs/` (créé au démarrage)

## 🔧 Troubleshooting

### L'app ne démarre pas

```bash
# Vérifier les logs
docker-compose logs app

# Commune : port 3000 déjà utilisé
lsof -i :3000  # Sur Linux/Mac
netstat -ano | findstr :3000  # Sur Windows
```

### Erreur de base de données

```bash
# Vérifier les variables
docker-compose config

# Tester la connexion
docker-compose exec app \
  npx prisma db push --skip-generate
```

### Erreur AUTH

Vérifier :
- `NEXTAUTH_URL` correspond à votre domaine
- `NEXTAUTH_SECRET` est défini et suffisamment fort

## 📦 CI/CD avec Docker

### GitLab CI

```yaml
build_image:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### GitHub Actions

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    tags: myregistry/zagency:latest
```

## 🚀 Scaling (Swarm/Kubernetes)

### Docker Swarm

```bash
docker swarm init
docker stack deploy -c docker-compose.prod.yml zagency
```

### Kubernetes

```bash
# Convertir compose en k8s
kompose convert -f docker-compose.prod.yml

# Déployer
kubectl apply -f *.yaml
```

## 📝 Notes importantes

1. **Base de données** - Le docker-compose n'inclut pas MySQL. Utilisez une DB externe ou ajoutez un service MySQL si nécessaire.

2. **Volumes** - Les données de logs sont persistées dans `./logs/`. Adapter selon votre infrastructure.

3. **Mise à jour** - Pour mettre à jour l'app :
   ```bash
   docker-compose down
   # Mettre à jour le code
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **Backup** - Pensez à sauvegarder votre base de données régulièrement.

## 🆘 Besoin d'aide ?

Pour des questions spécifiques :
- Vérifier les logs : `docker-compose logs app`
- Inspecting l'image : `docker inspect zagency:latest`
- Tester localement avec `docker-compose.yml` avant prod.yml