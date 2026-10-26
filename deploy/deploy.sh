#!/bin/sh
# Ship Qno-web to Jinx. The box keeps its own checkout at /opt/apps/Qno-web,
# so the unit of deployment is a fast-forward of that checkout, a rebuild in
# place and a restart of the `qno` systemd unit. The code is not copied from
# here, which is what makes a deploy from CI and a deploy from a laptop the
# same operation; only deploy/qno.service and deploy/qno.caddy go over from
# this tree.
#
# --ff-only rather than a plain pull: if the checkout on the box has drifted,
# stop and say so rather than quietly merging something nobody wrote.
#
# Re-runnable, and the first run on an empty box sets everything up: the
# clone, the unit, the site block. Dev dependencies are pruned once the build
# is done. The public hostname is a Cloudflare dashboard step: Zero Trust >
# Tunnels > Public Hostname, qno.futile.studio -> http://localhost:80.
set -eu
cd "$(dirname "$0")/.."
HOST=${HOST:-ssh.futile.studio}
NAME=qno
SITE=qno.futile.studio

scp -q deploy/qno.caddy deploy/$NAME.service "$HOST":/tmp/
ssh "$HOST" "NAME=$NAME SITE=$SITE sh -s" <<'BOX'
set -eu
if ! cmp -s "/tmp/$NAME.service" "/etc/systemd/system/$NAME.service"; then
  sudo -n install -m 644 "/tmp/$NAME.service" "/etc/systemd/system/$NAME.service"
  sudo -n systemctl daemon-reload
  sudo -n systemctl enable -q "$NAME"
fi
rm -f "/tmp/$NAME.service"

LIVE=/etc/caddy/conf.d/qno.caddy
IN=/tmp/qno.caddy
if cmp -s "$IN" "$LIVE"; then
  rm -f "$IN"
else
  # Imported into the config serving every site: validate, and restore on failure.
  sudo -n cp "$LIVE" "$IN.prev" 2>/dev/null || true
  sudo -n install -m 644 "$IN" "$LIVE" && rm -f "$IN"
  if ! caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
    if [ -f "$IN.prev" ]; then sudo -n mv "$IN.prev" "$LIVE"; else sudo -n rm -f "$LIVE"; fi
    echo "$NAME: site block rejected by caddy validate, config unchanged" >&2
    exit 1
  fi
  sudo -n rm -f "$IN.prev"
  sudo -n systemctl reload caddy
fi

[ -d /opt/apps/Qno-web/.git ] || git clone -q https://github.com/MayurJivani/Qno-web.git /opt/apps/Qno-web
cd /opt/apps/Qno-web
git pull -q --ff-only
# The root build runs npm ci in both halves. The socket URL is baked into the client at build time.
VITE_WS_URL=wss://$SITE npm run build
rm -rf frontend/node_modules
npm --prefix backend prune --omit=dev
# The box npm may rewrite lockfiles, and tsc rewrites tracked build info; put them back so the next pull fast-forwards.
git checkout -- frontend/package-lock.json backend/package-lock.json frontend/tsconfig.app.tsbuildinfo frontend/tsconfig.node.tsbuildinfo
sudo -n systemctl restart "$NAME"

# Come back and check through Caddy, rather than trusting that a restart meant "serving".
for _ in $(seq 1 30); do
  curl -sf -o /dev/null -H "Host: $SITE" http://127.0.0.1/health && break
  sleep 1
done
curl -sf -o /dev/null -H "Host: $SITE" http://127.0.0.1/health || {
  echo "$NAME: not serving through Caddy"; sudo -n journalctl -u "$NAME" -n 30 --no-pager; exit 1
}
BOX
echo "$NAME: deployed to https://$SITE"
