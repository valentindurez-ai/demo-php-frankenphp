# syntax=docker/dockerfile:1

FROM dunglas/frankenphp:1-php8.3

# Extensions requises par Symfony 7, Doctrine ORM et SQLite
RUN install-php-extensions \
        intl \
        opcache \
        pdo_sqlite \
        zip

COPY --from=composer/composer:2-bin /composer /usr/bin/composer

ENV APP_ENV=prod \
    APP_DEBUG=0 \
    COMPOSER_ALLOW_SUPERUSER=1

WORKDIR /app

# Couche de dependances : mise en cache tant que composer.lock ne bouge pas
COPY composer.json composer.lock symfony.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-progress \
        --no-interaction

COPY . .

# Autoloader optimise, scripts Symfony (cache:clear, assets:install)
RUN composer dump-autoload --classmap-authoritative --no-dev \
 && composer run-script post-install-cmd --no-interaction \
 && mkdir -p var/cache var/log var/data

# Base SQLite construite a l'image : la demo demarre avec ses donnees
RUN php bin/console doctrine:migrations:migrate \
        --no-interaction \
        --allow-no-migration

RUN chown -R www-data:www-data var

# Worker mode FrankenPHP : le process PHP reste vivant entre les requetes
COPY Caddyfile /etc/caddy/Caddyfile

# Port attendu par defaut sur le runtime Docker de Clever Cloud
EXPOSE 8080

CMD ["frankenphp", "run", "--config", "/etc/caddy/Caddyfile"]
