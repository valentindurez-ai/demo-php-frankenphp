#!/bin/sh
set -e

# SQLite lives on the container filesystem, so the schema is rebuilt on boot.
mkdir -p var/cache var/log
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

exec frankenphp run --config /etc/caddy/Caddyfile
