FROM dunglas/frankenphp:1-php8.3

WORKDIR /app

RUN install-php-extensions \
	intl \
	opcache \
	pdo_sqlite \
	zip

COPY --from=composer/composer:2-bin /composer /usr/bin/composer

# Dependencies first so they stay cached across source-only changes.
COPY composer.json composer.lock symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .

RUN composer dump-autoload --classmap-authoritative --no-dev \
	&& composer run-script --no-dev post-install-cmd \
	&& mkdir -p var/cache var/log \
	&& chmod -R 777 var

COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/app-entrypoint.sh
RUN chmod +x /usr/local/bin/app-entrypoint.sh

ENV APP_ENV=prod \
	APP_DEBUG=0

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/app-entrypoint.sh"]
