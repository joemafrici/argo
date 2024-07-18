#!/bin/sh

cp /run/secrets/cloudflare_cert /etc/nginx/ssl/cloudflare.crt
cp /run/secrets/cloudflare_key /etc/nginx/ssl/cloudflare.key

chomd 644 /etc/nginx/ssl/cloudflare.crt
chomd 600 /etc/nginx/ssl/cloudflare.key

envsubst '${NGINX_SERVER_NAME}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

nginx -g 'daemon off;'
