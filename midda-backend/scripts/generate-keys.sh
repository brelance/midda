#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ -e secrets/private.pem ] || [ -e secrets/public.pem ]; then
  echo 'JWT keys already exist; leaving them unchanged.'
  exit 0
fi
umask 077
mkdir -p secrets
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out secrets/private.pem
openssl pkey -in secrets/private.pem -pubout -out secrets/public.pem
echo 'Generated local JWT keys in midda-backend/secrets/.'
