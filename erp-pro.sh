#!/bin/bash
# ============================================================
# ERP Pro - Setup & Run Script
# سكريبت الإعداد والتشغيل الموحد
#
# الاستخدام:
#   ./erp-pro.sh setup     - إعداد أول مرة
#   ./erp-pro.sh start     - تشغيل النظام
#   ./erp-pro.sh stop      - إيقاف النظام
#   ./erp-pro.sh status    - حالة النظام
#   ./erp-pro.sh reset     - إعادة تعيين كامل
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║        ERP Pro - نظام متكامل        ║"
echo "║   إعداد وتشغيل المنظومة الكاملة     ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}خطأ: Docker غير مثبت. يرجى تثبيته أولاً${NC}"
        echo "https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}خطأ: Docker Compose غير مثبت${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker متوفر${NC}"
}

# Setup - First time initialization
setup() {
    echo -e "${YELLOW}═══ الإعداد الأولي ═══${NC}"

    check_docker

    # Create .env if not exists
    if [ ! -f .env ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ تم إنشاء ملف .env${NC}"
    fi

    # Create required directories
    mkdir -p docker/mariadb/conf.d

    echo -e "${YELLOW}═══ بناء الحاويات ═══${NC}"
    docker compose build

    echo -e "${YELLOW}═══ تشغيل الخدمات ═══${NC}"
    docker compose up -d mariadb redis-cache redis-queue redis-socketio

    echo -e "${YELLOW}═══ انتظار قاعدة البيانات ═══${NC}"
    sleep 15

    echo -e "${YELLOW}═══ تشغيل الباك إند ═══${NC}"
    docker compose up -d backend socketio scheduler worker-default worker-long worker-short

    echo -e "${YELLOW}═══ انتظار الباك إند ═══${NC}"
    echo "قد يستغرق هذا بعض الوقت في المرة الأولى..."
    sleep 30

    # Create site
    echo -e "${YELLOW}═══ إنشاء الموقع ═══${NC}"
    docker compose exec backend bench new-site erppro \
        --admin-password "${ADMIN_PASSWORD:-admin}" \
        --db-root-password "${DB_ROOT_PASSWORD:?set DB_ROOT_PASSWORD in .env}" \
        --install-app erpnext \
        --set-default || true

    echo -e "${YELLOW}═══ تشغيل الواجهة الأمامية ═══${NC}"
    docker compose up -d frontend

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     تم الإعداد بنجاح!              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "الواجهة الأمامية: ${BLUE}http://localhost:3000${NC}"
    echo -e "لوحة التحكم:      ${BLUE}http://localhost:3000/login${NC}"
    echo ""
    echo -e "مستخدم المدير:    ${YELLOW}Administrator${NC}"
    echo -e "كلمة المرور:      ${YELLOW}${ADMIN_PASSWORD:-admin}${NC}"
}

# Start - Run the system
start() {
    check_docker
    echo -e "${YELLOW}═══ تشغيل النظام ═══${NC}"
    docker compose up -d
    echo -e "${GREEN}✓ النظام يعمل${NC}"
    echo -e "الواجهة: ${BLUE}http://localhost:3000${NC}"
}

# Stop - Stop the system
stop() {
    echo -e "${YELLOW}═══ إيقاف النظام ═══${NC}"
    docker compose down
    echo -e "${GREEN}✓ تم إيقاف النظام${NC}"
}

# Status - Check system status
status() {
    echo -e "${YELLOW}═══ حالة النظام ═══${NC}"
    docker compose ps
}

# Reset - Full reset
reset() {
    echo -e "${RED}═══ إعادة تعيين كامل ═══${NC}"
    echo -e "${RED}تحذير: سيتم حذف جميع البيانات!${NC}"
    read -p "هل أنت متأكد؟ (y/N) " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        docker compose down -v
        echo -e "${GREEN}✓ تم إعادة التعيين${NC}"
    fi
}

# Development mode (without Docker)
dev() {
    echo -e "${YELLOW}═══ وضع التطوير المحلي ═══${NC}"
    echo -e "الواجهة فقط: ${BLUE}http://localhost:3000${NC}"
    echo -e "ملاحظة: الوضع التجريبي يعمل بدون باك إند"
    bun run dev
}

# Main
case "${1:-help}" in
    setup)   setup   ;;
    start)   start   ;;
    stop)    stop    ;;
    status)  status  ;;
    reset)   reset   ;;
    dev)     dev     ;;
    help|*)
        echo "الاستخدام: ./erp-pro.sh [الأمر]"
        echo ""
        echo "الأوامر:"
        echo "  setup   - إعداد أول مرة (بناء + تشغيل + تهيئة)"
        echo "  start   - تشغيل النظام"
        echo "  stop    - إيقاف النظام"
        echo "  status  - حالة الخدمات"
        echo "  reset   - إعادة تعيين كامل (حذف البيانات)"
        echo "  dev     - وضع التطوير المحلي (بدون Docker)"
        ;;
esac
