#!/bin/sh
# Post-build script: Copy static files to standalone directory
# This fixes the Next.js standalone mode 404 issue for CSS/JS/fonts
# Must run after `next build`

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[postbuild] Copying static assets to standalone directory..."

# Copy .next/static → .next/standalone/.next/static
if [ -d "$PROJECT_DIR/.next/static" ] && [ -d "$PROJECT_DIR/.next/standalone" ]; then
  cp -r "$PROJECT_DIR/.next/static" "$PROJECT_DIR/.next/standalone/.next/"
  echo "  ✓ Copied .next/static → .next/standalone/.next/static"
else
  echo "  ⚠ Skipped: .next/static or .next/standalone not found"
fi

# Copy public → .next/standalone/public
if [ -d "$PROJECT_DIR/public" ] && [ -d "$PROJECT_DIR/.next/standalone" ]; then
  cp -r "$PROJECT_DIR/public" "$PROJECT_DIR/.next/standalone/"
  echo "  ✓ Copied public → .next/standalone/public"
else
  echo "  ⚠ Skipped: public or .next/standalone not found"
fi

# INF-07: لا نسخ لـ .env داخل standalone — الإعدادات تُمرر وقت التشغيل فقط
# (الأسرار في ملف .env لا يجب أن تدخل الأرتيفاكت المنشور)

echo "[postbuild] Done!"
