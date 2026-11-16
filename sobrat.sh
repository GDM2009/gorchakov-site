#!/bin/sh
# Сборка сайта под новый адрес. Нужен Node.js 18 или новее.
#   ./sobrat.sh https://example.ru            — сайт в корне домена
#   ./sobrat.sh https://example.ru /expert    — сайт в подпапке /expert
set -e
[ -n "$1" ] || { echo "Укажите адрес сайта, например: ./sobrat.sh https://example.ru"; exit 1; }
cd "$(dirname "$0")"
node tools/build.js "$1" "${2:-}"
echo "Готовый сайт лежит в папке novyi-sait. Загрузите её содержимое на хостинг."
