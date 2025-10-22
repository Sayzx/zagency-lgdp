# 🚀 Guide de Configuration Production - Zagency

## ✅ Fichiers créés

```
├── Dockerfile                    # Multi-stage build optimisé
├── docker-compose.yml            # Configuration simple (dev/test)
├── docker-compose.prod.yml       # Configuration avancée (production)
├── .dockerignore                 # Fichiers à exclure du build
├── .env.production               # Template des variables
├── deploy.sh                     # Script de déploiement (Linux/Mac)
├── deploy.bat                    # Script de déploiement (Windows)
├── DOCKER_DEPLOYMENT.md          # Documentation complète
└── PRODUCTION_SETUP.md           # Ce fichier
```

## 🎯 Démarrage rapide (5 min)

### 1️⃣ Générer une clé secrète

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -Count 32 | ForEach-Object {[char]$_} | Join-String)))
```

Sauvegardez cette clé ! ⭐

### 2️⃣ Configurer l'environnement

```bash
# Copier le template
cp .env.production .env.prod

# Éditer les valeurs
nano .env.prod  # Linux/Mac
# ou
notepad .env.prod  # Windows
```

**À remplir** :
```env
DATABASE_URL="mysql://user:password@host:port/database_name"
NEXTAUTH_URL="https://votre-domaine.com"
NEXTAUTH_SECRET="votre-clé-générée-ci-dessus"
```

### 3️⃣ Lancer l'application

**Option A : Mode interactif**
```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh

# Windows
deploy.bat
```

**Option B : Commandes directes**
```bash
# Démarrer
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Vérifier
docker-compose -f docker-compose.prod.yml ps

# Logs
docker-compose -f docker-compose.prod.yml logs -f app

# Arrêter
docker-compose -f docker-compose.prod.yml down
```

## 📊 Checklist de production

Avant le lancement :

- [ ] Base de données MySQL accessible et fonctionnelle
- [ ] Domaine configuré et DNS pointant vers le serveur
- [ ] Certificate SSL/TLS (pour HTTPS)
- [ ] `NEXTAUTH_SECRET` généré et fort (32 caractères +)
- [ ] `NEXTAUTH_URL` défini avec le bon domaine
- [ ] `.env.prod` créé et **PAS** committé en Git
- [ ] Docker et Docker Compose installés
- [ ] Firewall autorise le port 3000 (ou port derrière proxy)
- [ ] Logs configurés et rotation activée
- [ ] Health check activé et fonctionnel

## 🏗️ Architecture typique

```
┌─────────────────────────────────────────────┐
│         Internet / Utilisateurs              │
└────────────────────┬────────────────────────┘
                     │ HTTPS (port 443)
                     ▼
┌─────────────────────────────────────────────┐
│    Nginx / Traefik (Reverse Proxy)          │
│    - SSL/TLS termination                    │
│    - Load balancing                         │
└────────────────────┬────────────────────────┘
                     │ HTTP (port 3000)
                     ▼
        ┌────────────────────────┐
        │   Docker Container     │
        │   (Next.js App)        │
        │   - Node.js Alpine     │
        │   - Port 3000          │
        └────────────┬───────────┘
                     │
        ┌────────────▼───────────┐
        │  MySQL Database        │
        │  (Externe)             │
        └────────────────────────┘
```

## 🔒 Sécurité - Points clés

### Secrets
```bash
# ❌ NE PAS faire
DATABASE_URL=mysql://user:password@host/db
NEXTAUTH_SECRET=mysecret123

# ✅ À faire
# Utiliser un gestionnaire de secrets :
# - HashiCorp Vault
# - AWS Secrets Manager
# - 1Password / Bitwarden
# - Variables Docker Swarm/Kubernetes secrets
```

### Réseau
```yaml
# Isoler l'app dans un réseau Docker
networks:
  zagency-network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: br_zagency
```

### Utilisateur non-root
```dockerfile
# L'image crée automatiquement un utilisateur
# Éxécution en tant que 'nextjs' (UID 1001)
```

## 📈 Performance

### Ressources par défaut
- **CPU** : 1 core réservé, max 2
- **RAM** : 1GB réservé, max 2GB
- **Disque** : Adapter à vos logs

À augmenter si :
- Beaucoup d'utilisateurs simultanés
- Opérations lourdes à la base de données

```yaml
# Exemple: doubler les ressources
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '2'
      memory: 2G
```

### Scaling horizontal

```bash
# Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml zagency

# Avec Nginx load balancer
# Vérifier la doc complète pour les exemples
```

## 🚨 Troubleshooting courant

### "Port 3000 déjà utilisé"
```bash
# Vérifier quel processus
lsof -i :3000  # Linux/Mac
Get-NetTCPConnection -LocalPort 3000  # Windows

# Solution : changer le port
docker run -p 8080:3000 ...
```

### "Erreur de connexion à la base"
```bash
# Vérifier la DATABASE_URL
docker-compose config | grep DATABASE_URL

# Tester depuis le conteneur
docker exec -it zagency-app \
  npx prisma db push --skip-generate

# Vérifier les credentials
mysql -h host -u user -p database_name
```

### "NEXTAUTH_SECRET invalide"
```bash
# Erreur : valeur non définie ou trop courte
# Solution : générer une nouvelle clé (32+ caractères)
openssl rand -base64 32
```

### "Application timeout au démarrage"
```bash
# Vérifier les logs détaillés
docker-compose logs app

# Problèmes courants :
# 1. Base de données inaccessible
# 2. Prisma client non généré
# 3. Variables d'environnement manquantes
```

## 🔄 Mise à jour de l'application

```bash
# 1. Arrêter
docker-compose -f docker-compose.prod.yml down

# 2. Mettre à jour le code
git pull origin main
# ou télécharger la nouvelle version

# 3. Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache

# 4. Redémarrer
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 5. Vérifier
docker-compose -f docker-compose.prod.yml logs -f app
```

## 📝 Backup et récupération

### Base de données
```bash
# Backup
docker exec -it zagency-app \
  mysqldump -h host -u user -p database > backup.sql

# Restauration
mysql -h host -u user -p database < backup.sql
```

### Données d'application
```bash
# Sauvegarder les logs
cp -r logs logs.backup

# Sauvegarder les volumes
docker run --rm -v zagency_logs:/volume \
  -v $(pwd):/backup alpine tar czf /backup/logs.tar.gz -C /volume .
```

## 🎓 Ressources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production Checks](https://www.prisma.io/docs/guides/deployment/deployment-guide)
- [Next-Auth.js Security](https://next-auth.js.org/deployment)

## 📞 Support

Pour des problèmes spécifiques :

1. Vérifier les logs : `docker-compose logs app`
2. Consulter `DOCKER_DEPLOYMENT.md`
3. Tester localement avec `docker-compose.yml` avant prod

## ✨ Bonnes pratiques

✅ **À faire** :
- Utiliser des certificats SSL/TLS
- Configurer un reverse proxy (Nginx/Traefik)
- Monitorer l'application (Prometheus, Grafana)
- Configurer des alertes
- Faire des backups réguliers
- Utiliser une registry privée pour les images
- Versioner les images (`latest` + version spécifique)

❌ **À éviter** :
- Stocker les secrets dans le code
- Utiliser l'utilisateur root dans Docker
- Exposer directement le port 3000 en production
- Désactiver le firewall
- Ne pas mettre à jour les images de base
- Ne pas configurer de health check

---

**Bonne chance pour votre déploiement production ! 🎉**