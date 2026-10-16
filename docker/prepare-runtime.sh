#!/usr/bin/env sh
set -eu
mkdir -p /etc/nginx/snippets
mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp
sed -i -e 's|/var/run/nginx.pid|/tmp/nginx.pid|' -e 's|/run/nginx.pid|/tmp/nginx.pid|' /etc/nginx/nginx.conf
chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /etc/nginx/snippets
