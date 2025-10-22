@echo off
REM 🚀 Zagency Deployment Script for Windows

setlocal enabledelayedexpansion

set "APP_NAME=zagency-app"
set "DOCKER_COMPOSE_FILE=docker-compose.prod.yml"
set "ENV_FILE=.env.prod"

if not exist "%ENV_FILE%" (
    echo ✗ Fichier d'environnement '%ENV_FILE%' non trouvé
    echo Créez-le avec: copy .env.production %ENV_FILE%
    exit /b 1
)

if "%1"=="" (
    goto menu
) else (
    goto cli_mode
)

:menu
cls
echo.
echo === Zagency Deployment Menu ===
echo.
echo 1. Build l'image Docker
echo 2. Démarrer l'application
echo 3. Arrêter l'application
echo 4. Redémarrer l'application
echo 5. Voir les logs
echo 6. Vérifier l'état
echo 7. Rebuild et redémarrer
echo 8. Nettoyer (supprimer conteneur)
echo 9. Full reset (tout supprimer)
echo 0. Quitter
echo.
set /p choice="Choisir une option (0-9): "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto status
if "%choice%"=="7" goto rebuild
if "%choice%"=="8" goto cleanup
if "%choice%"=="9" goto reset
if "%choice%"=="0" (
    echo Au revoir!
    exit /b 0
)
echo ✗ Option invalide
goto menu

:build
echo.
echo ℹ Construction de l'image Docker...
docker build -t %APP_NAME%:latest .
echo ✓ Image construite
goto menu

:start
echo.
echo ℹ Démarrage de l'application...
docker-compose -f %DOCKER_COMPOSE_FILE% --env-file %ENV_FILE% up -d
echo ✓ Application démarrée
timeout /t 2 /nobreak
goto menu

:stop
echo.
echo ℹ Arrêt de l'application...
docker-compose -f %DOCKER_COMPOSE_FILE% down
echo ✓ Application arrêtée
goto menu

:restart
echo.
echo ℹ Redémarrage de l'application...
docker-compose -f %DOCKER_COMPOSE_FILE% down
timeout /t 2 /nobreak
docker-compose -f %DOCKER_COMPOSE_FILE% --env-file %ENV_FILE% up -d
echo ✓ Application redémarrée
goto menu

:logs
echo.
echo ℹ Affichage des logs (Ctrl+C pour quitter)...
docker-compose -f %DOCKER_COMPOSE_FILE% logs -f app
goto menu

:status
echo.
echo ℹ État de l'application:
docker-compose -f %DOCKER_COMPOSE_FILE% ps
echo.
goto menu

:rebuild
echo.
echo ℹ Rebuild et redémarrage...
docker-compose -f %DOCKER_COMPOSE_FILE% down
docker build -t %APP_NAME%:latest .
docker-compose -f %DOCKER_COMPOSE_FILE% --env-file %ENV_FILE% up -d
echo ✓ Rebuild et redémarrage terminés
timeout /t 2 /nobreak
goto menu

:cleanup
echo.
echo ⚠ Suppression du conteneur...
docker-compose -f %DOCKER_COMPOSE_FILE% down -v
docker rmi %APP_NAME%:latest 2>nul
echo ✓ Nettoyage terminé
goto menu

:reset
echo.
echo ⚠ ATTENTION: Cela va supprimer tous les conteneurs et images
set /p confirm="Êtes-vous sûr (oui/non): "
if not "!confirm!"=="oui" (
    echo Annulé
    goto menu
)
docker-compose -f %DOCKER_COMPOSE_FILE% down -v --remove-orphans
docker rmi %APP_NAME%:latest 2>nul
docker system prune -f
echo ✓ Reset complet terminé
goto menu

:cli_mode
if "%1"=="build" (
    docker build -t %APP_NAME%:latest .
) else if "%1"=="start" (
    docker-compose -f %DOCKER_COMPOSE_FILE% --env-file %ENV_FILE% up -d
) else if "%1"=="stop" (
    docker-compose -f %DOCKER_COMPOSE_FILE% down
) else if "%1"=="restart" (
    docker-compose -f %DOCKER_COMPOSE_FILE% down
    timeout /t 2 /nobreak
    docker-compose -f %DOCKER_COMPOSE_FILE% --env-file %ENV_FILE% up -d
) else if "%1"=="logs" (
    docker-compose -f %DOCKER_COMPOSE_FILE% logs -f app
) else if "%1"=="status" (
    docker-compose -f %DOCKER_COMPOSE_FILE% ps
) else if "%1"=="rebuild" (
    docker-compose -f %DOCKER_COMPOSE_FILE% down
    docker build -t %APP_NAME%:latest .
    docker-compose -f %DOCKER_COMPOSE_FILE% --env-file %ENV_FILE% up -d
) else if "%1"=="clean" (
    docker-compose -f %DOCKER_COMPOSE_FILE% down -v
    docker rmi %APP_NAME%:latest 2>nul
) else if "%1"=="reset" (
    docker-compose -f %DOCKER_COMPOSE_FILE% down -v --remove-orphans
    docker rmi %APP_NAME%:latest 2>nul
    docker system prune -f
) else (
    echo Usage: %0 {build^|start^|stop^|restart^|logs^|status^|rebuild^|clean^|reset}
    exit /b 1
)