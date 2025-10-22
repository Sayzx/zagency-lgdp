#!/bin/bash

# 🚀 Zagency Deployment Script
# Ce script facilite le déploiement en production

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="zagency-app"
DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"

# Fonctions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier les prérequis
check_requirements() {
    log_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    log_success "Docker trouvé"
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    log_success "Docker Compose trouvé"
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Fichier d'environnement '$ENV_FILE' non trouvé"
        log_info "Créez-le avec: cp .env.production $ENV_FILE"
        exit 1
    fi
    log_success "Fichier d'environnement trouvé"
}

# Afficher le menu
show_menu() {
    echo
    echo -e "${BLUE}=== Zagency Deployment Menu ===${NC}"
    echo "1. Build l'image Docker"
    echo "2. Démarrer l'application"
    echo "3. Arrêter l'application"
    echo "4. Redémarrer l'application"
    echo "5. Voir les logs"
    echo "6. Vérifier l'état"
    echo "7. Rebuild et redémarrer"
    echo "8. Nettoyer (supprimer conteneur)"
    echo "9. Full reset (tout supprimer)"
    echo "0. Quitter"
    echo
}

# Build l'image
build_image() {
    log_info "Construction de l'image Docker..."
    docker build -t $APP_NAME:latest .
    log_success "Image construite avec succès"
}

# Démarrer
start_app() {
    log_info "Démarrage de l'application..."
    docker-compose -f $DOCKER_COMPOSE_FILE --env-file $ENV_FILE up -d
    log_success "Application démarrée"
    sleep 2
    check_health
}

# Arrêter
stop_app() {
    log_info "Arrêt de l'application..."
    docker-compose -f $DOCKER_COMPOSE_FILE down
    log_success "Application arrêtée"
}

# Redémarrer
restart_app() {
    log_info "Redémarrage de l'application..."
    stop_app
    sleep 2
    start_app
}

# Logs
show_logs() {
    log_info "Affichage des logs (Ctrl+C pour quitter)..."
    docker-compose -f $DOCKER_COMPOSE_FILE logs -f app
}

# Vérifier l'état
check_status() {
    log_info "État de l'application:"
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    echo
    
    # Vérifier si accessible
    if curl -s http://localhost:3000 > /dev/null; then
        log_success "Application accessible sur http://localhost:3000"
    else
        log_warning "Application non accessible sur http://localhost:3000"
    fi
}

# Vérifier la santé
check_health() {
    log_info "Vérification de la santé de l'application..."
    
    # Attendre le démarrage
    sleep 5
    
    for i in {1..10}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            log_success "Application démarrée avec succès ✓"
            return 0
        fi
        log_info "Tentative $i/10... en attente du démarrage"
        sleep 3
    done
    
    log_warning "Timeout lors du démarrage. Vérifiez les logs avec: docker-compose logs app"
    return 1
}

# Rebuild et redémarrer
rebuild_restart() {
    log_info "Rebuild et redémarrage complets..."
    stop_app
    build_image
    start_app
}

# Nettoyer
cleanup() {
    log_warning "Suppression du conteneur et de l'image..."
    docker-compose -f $DOCKER_COMPOSE_FILE down -v
    docker rmi $APP_NAME:latest 2>/dev/null || true
    log_success "Nettoyage terminé"
}

# Reset complet
full_reset() {
    log_warning "⚠️  ATTENTION: Cela va supprimer tous les conteneurs et images"
    read -p "Êtes-vous sûr ? (oui/non): " confirm
    
    if [ "$confirm" != "oui" ]; then
        log_info "Annulé"
        return
    fi
    
    docker-compose -f $DOCKER_COMPOSE_FILE down -v --remove-orphans
    docker rmi $APP_NAME:latest 2>/dev/null || true
    docker system prune -f
    log_success "Reset complet terminé"
}

# Script interactif
interactive_mode() {
    while true; do
        show_menu
        read -p "Choisir une option (0-9): " choice
        
        case $choice in
            1) build_image ;;
            2) start_app ;;
            3) stop_app ;;
            4) restart_app ;;
            5) show_logs ;;
            6) check_status ;;
            7) rebuild_restart ;;
            8) cleanup ;;
            9) full_reset ;;
            0) 
                log_info "Au revoir!"
                exit 0
                ;;
            *)
                log_error "Option invalide"
                ;;
        esac
    done
}

# Mode command line
cli_mode() {
    case "$1" in
        build)
            build_image
            ;;
        start)
            start_app
            ;;
        stop)
            stop_app
            ;;
        restart)
            restart_app
            ;;
        logs)
            show_logs
            ;;
        status)
            check_status
            ;;
        rebuild)
            rebuild_restart
            ;;
        clean)
            cleanup
            ;;
        reset)
            full_reset
            ;;
        *)
            echo "Usage: $0 {build|start|stop|restart|logs|status|rebuild|clean|reset}"
            exit 1
            ;;
    esac
}

# Main
main() {
    check_requirements
    
    if [ $# -eq 0 ]; then
        interactive_mode
    else
        cli_mode "$@"
    fi
}

main "$@"