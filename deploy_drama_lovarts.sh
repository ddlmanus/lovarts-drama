#!/usr/bin/env bash
set -Eeuo pipefail

# One-command deploy for Lovarts Drama.
# Override any default by prefixing the command, for example:
#   SERVER_PASS='...' DOMAIN='drama.lovarts.art' bash deploy_drama_lovarts.sh

SERVER_IP="${SERVER_IP:-103.171.35.146}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PASS="${SERVER_PASS:-20zKHvlw47CJEg}"
DOMAIN="${DOMAIN:-drama.lovarts.art}"
SKIP_DB_SYNC="${SKIP_DB_SYNC:-1}"

REMOTE_DIR="${REMOTE_DIR:-/www/wwwroot/drama-lovarts}"
APP_NAME="${APP_NAME:-drama-lovarts-backend}"
APP_PORT="${APP_PORT:-5679}"
ENV_FILE="${ENV_FILE:-backend/.env}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)
SSH_TARGET="${SERVER_USER}@${SERVER_IP}"
RELEASE_TARBALL="lovarts-drama-$(date +%Y%m%d%H%M%S).tar.gz"
LOCAL_TARBALL="/tmp/${RELEASE_TARBALL}"
REMOTE_TARBALL="/tmp/${RELEASE_TARBALL}"
SSH_CONTROL_PATH="/tmp/lovarts-drama-ssh-${SERVER_IP//./-}-%r"
REMOTE_SCRIPT_LOCAL="/tmp/deploy-drama-lovarts-remote-$$.sh"
REMOTE_SCRIPT_PATH="/tmp/deploy-drama-lovarts-remote.sh"

log() {
  printf '\033[1;34m==>\033[0m %s\n' "$*"
}

die() {
  printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing local command: $1"
}

ssh_run() {
  sshpass -p "$SERVER_PASS" ssh "${SSH_OPTS[@]}" -o ControlMaster=auto -o ControlPath="$SSH_CONTROL_PATH" -o ControlPersist=10m "$SSH_TARGET" "$@"
}

scp_upload() {
  sshpass -p "$SERVER_PASS" scp "${SSH_OPTS[@]}" -o ControlMaster=auto -o ControlPath="$SSH_CONTROL_PATH" -o ControlPersist=10m "$1" "${SSH_TARGET}:$2"
}

open_ssh_master() {
  sshpass -p "$SERVER_PASS" ssh "${SSH_OPTS[@]}" -o ControlMaster=yes -o ControlPath="$SSH_CONTROL_PATH" -o ControlPersist=10m -MNf "$SSH_TARGET"
}

close_ssh_master() {
  ssh "${SSH_OPTS[@]}" -o ControlPath="$SSH_CONTROL_PATH" -O exit "$SSH_TARGET" >/dev/null 2>&1 || true
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

need_cmd tar
need_cmd sshpass
need_cmd ssh
need_cmd scp

[ -f frontend/package.json ] || die "frontend/package.json not found. Run this script from the project root."
[ -f backend/package.json ] || die "backend/package.json not found. Run this script from the project root."
[ -f "$ENV_FILE" ] || die "Env file not found: $ENV_FILE"

trap close_ssh_master EXIT

log "Packaging project"
rm -f "$LOCAL_TARBALL"
tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='frontend/node_modules' \
  --exclude='backend/node_modules' \
  --exclude='frontend/.nuxt' \
  --exclude='frontend/.output' \
  --exclude='backend/dist' \
  --exclude='data' \
  --exclude='output' \
  --exclude='*.log' \
  -czf "$LOCAL_TARBALL" \
  .

log "Preparing server ${SSH_TARGET}"
open_ssh_master
ssh_run "mkdir -p '$REMOTE_DIR' '$REMOTE_DIR/shared/data/static'"

log "Uploading release"
scp_upload "$LOCAL_TARBALL" "$REMOTE_TARBALL"

cat >"$REMOTE_SCRIPT_LOCAL" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

log() {
  printf '\033[1;34m==>\033[0m %s\n' "$*"
}

install_base_packages() {
  export DEBIAN_FRONTEND=noninteractive
  export NEEDRESTART_MODE=a
  apt-get update
  apt-get install -y --no-install-recommends \
    -o Dpkg::Options::=--force-confdef \
    -o Dpkg::Options::=--force-confold \
    ca-certificates curl gnupg nginx ffmpeg tar gzip

  if ! command -v node >/dev/null 2>&1 || ! node -v | grep -Eq '^v2[0-9]\.'; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y \
      -o Dpkg::Options::=--force-confdef \
      -o Dpkg::Options::=--force-confold \
      nodejs
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
  fi

  if ! command -v certbot >/dev/null 2>&1; then
    apt-get install -y \
      -o Dpkg::Options::=--force-confdef \
      -o Dpkg::Options::=--force-confold \
      certbot python3-certbot-nginx
  fi
}

write_nginx_http_config() {
  if [ -x /www/server/nginx/sbin/nginx ] && [ -d /www/server/panel/vhost/nginx ]; then
    local cert_name="lovarts.art"
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
      cert_name="$DOMAIN"
    fi
    mkdir -p "${REMOTE_DIR}/acme/.well-known/acme-challenge"
    cat >"/www/server/panel/vhost/nginx/${DOMAIN}.conf" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location ^~ /.well-known/acme-challenge/ { root ${REMOTE_DIR}/acme; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN};
    client_max_body_size 1024m;
    ssl_certificate /etc/letsencrypt/live/${cert_name}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${cert_name}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json application/xml image/svg+xml;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    location ^~ /.well-known/acme-challenge/ { root ${REMOTE_DIR}/acme; }
    location ^~ /_nuxt/ {
        alias ${REMOTE_DIR}/current/frontend/.output/public/_nuxt/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
        try_files \$uri =404;
    }
    location ^~ /inspiration/ {
        alias ${REMOTE_DIR}/current/frontend/.output/public/inspiration/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        try_files \$uri =404;
    }
    location ^~ /static/ {
        alias ${REMOTE_DIR}/current/data/static/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        try_files \$uri =404;
    }
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header Cookie \$http_cookie;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
NGINX
    # Nginx applies protocol options per listen socket. Other vhosts on the
    # same 443 socket can keep HTTP/2 enabled for this domain unless normalized.
    if [ -f "/www/server/panel/vhost/nginx/lovarts.art.conf" ]; then
      sed -i 's/listen 443 ssl http2;/listen 443 ssl;/g; s/listen \[::\]:443 ssl http2;/listen [::]:443 ssl;/g' "/www/server/panel/vhost/nginx/lovarts.art.conf"
    fi
    /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
    /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf || kill -HUP "$(cat /www/server/nginx/logs/nginx.pid)"
    return
  fi

  cat >"/etc/nginx/sites-available/${DOMAIN}.conf" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 200m;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json application/xml image/svg+xml;

    location ^~ /_nuxt/ {
        alias ${REMOTE_DIR}/current/frontend/.output/public/_nuxt/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
        try_files \$uri =404;
    }
    location ^~ /inspiration/ {
        alias ${REMOTE_DIR}/current/frontend/.output/public/inspiration/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        try_files \$uri =404;
    }
    location ^~ /static/ {
        alias ${REMOTE_DIR}/current/data/static/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        try_files \$uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
NGINX

  ln -sf "/etc/nginx/sites-available/${DOMAIN}.conf" "/etc/nginx/sites-enabled/${DOMAIN}.conf"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable nginx
  systemctl reload nginx || systemctl restart nginx
}

issue_https_cert() {
  if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    log "HTTPS certificate already exists for ${DOMAIN}"
    certbot renew --quiet || true
    return
  fi

  log "Requesting HTTPS certificate for ${DOMAIN}"
  if [ -x /www/server/nginx/sbin/nginx ] && [ -d /www/server/panel/vhost/nginx ]; then
    mkdir -p "${REMOTE_DIR}/acme/.well-known/acme-challenge"
    if certbot certonly --webroot -w "${REMOTE_DIR}/acme" -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email; then
      write_nginx_http_config
    else
      log "Certbot failed. Check that ${DOMAIN} DNS points to this server and ports 80/443 are open."
      return 1
    fi
  elif certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
    systemctl reload nginx || systemctl restart nginx
  else
    log "Certbot failed. Check that ${DOMAIN} DNS points to this server and ports 80/443 are open."
    return 1
  fi
}

deploy_release() {
  local release_dir="${REMOTE_DIR}/releases/$(date +%Y%m%d%H%M%S)"
  mkdir -p "$release_dir" "${REMOTE_DIR}/shared/data/static"
  tar -xzf "$REMOTE_TARBALL" -C "$release_dir"
  rm -f "$REMOTE_TARBALL"

  cd "$release_dir/frontend"
  npm ci
  npm run generate

  cd "$release_dir/backend"
  npm ci

  cd "$release_dir"
  rm -rf data/static
  mkdir -p data
  ln -sfn "${REMOTE_DIR}/shared/data/static" data/static

  if [ -d "${REMOTE_DIR}/shared/data/codex" ]; then
    rm -rf data/codex
    ln -sfn "${REMOTE_DIR}/shared/data/codex" data/codex
  fi

  ln -sfn "$release_dir" "${REMOTE_DIR}/current"

  cd "${REMOTE_DIR}/current/backend"
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 delete "$APP_NAME"
  fi
  PORT="$APP_PORT" NODE_ENV=production PUBLIC_URL="https://${DOMAIN}" API_PUBLIC_URL="https://${DOMAIN}" pm2 start npm --name "$APP_NAME" -- run start
  pm2 save
}

install_base_packages
deploy_release
write_nginx_http_config
issue_https_cert
if [ "${SKIP_DB_SYNC}" = "1" ] || [ "${SKIP_DB_SYNC}" = "true" ]; then
  log "Skipping database sync"
else
  npm --prefix "${REMOTE_DIR}/current/backend" run db:sync:membership || true
fi
pm2 restart "$APP_NAME" --update-env || true

log "Deployment finished: https://${DOMAIN}"
REMOTE_SCRIPT

log "Uploading remote deploy runner"
scp_upload "$REMOTE_SCRIPT_LOCAL" "$REMOTE_SCRIPT_PATH"

log "Installing and starting application on server"
ssh_run "DOMAIN='$DOMAIN' REMOTE_DIR='$REMOTE_DIR' APP_NAME='$APP_NAME' APP_PORT='$APP_PORT' SKIP_DB_SYNC='$SKIP_DB_SYNC' REMOTE_TARBALL='$REMOTE_TARBALL' bash '$REMOTE_SCRIPT_PATH'"

rm -f "$REMOTE_SCRIPT_LOCAL"
rm -f "$LOCAL_TARBALL"

log "Done: https://${DOMAIN}"
