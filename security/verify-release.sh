#!/bin/sh
set -eu

: "${COSIGN_URL:?Missing pinned Cosign download URL}"
: "${COSIGN_SHA256:?Missing pinned Cosign checksum}"
: "${SIGNING_IDENTITY:?Missing expected workflow identity}"
: "${IMAGE_TAG:?Missing expected commit}"
: "${EXPECTED_IMAGES:?Missing expected deployment image keys}"
case "$COSIGN_URL" in
  https://github.com/sigstore/cosign/releases/download/v*/cosign-linux-amd64) ;;
  *) echo 'Unexpected Cosign download source' >&2; exit 1 ;;
esac
printf '%s' "$COSIGN_SHA256" | grep -Eq '^[a-f0-9]{64}$'
printf '%s' "$IMAGE_TAG" | grep -Eq '^[a-f0-9]{40}$'

security_bin="$HOME/.local/share/velvet-security/$COSIGN_SHA256"
mkdir -p "$security_bin"
temporary=$(mktemp)
trap 'rm -f "$temporary"' EXIT HUP INT TERM
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 "$COSIGN_URL" --output "$temporary"
printf '%s  %s\n' "$COSIGN_SHA256" "$temporary" | sha256sum --check --status
install -m 0755 "$temporary" "$security_bin/cosign"

test -s images.txt
expected_count=0
for variable in $EXPECTED_IMAGES; do
  printf '%s' "$variable" | grep -Eq '^[A-Z][A-Z0-9_]*_IMAGE$'
  matches=$(grep -c "^$variable=" images.txt || true)
  test "$matches" -eq 1
  expected_count=$((expected_count + 1))
done
test "$(wc -l < images.txt)" -eq "$expected_count"
while IFS='=' read -r variable reference; do
  printf '%s' "$variable" | grep -Eq '^[A-Z][A-Z0-9_]*_IMAGE$'
  printf '%s' "$reference" | grep -Eq '^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_./-]+@sha256:[a-f0-9]{64}$'
  "$security_bin/cosign" verify --certificate-identity "$SIGNING_IDENTITY" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    --annotations "commit=$IMAGE_TAG" "$reference" >/dev/null
  "$security_bin/cosign" verify-attestation --type cyclonedx \
    --certificate-identity "$SIGNING_IDENTITY" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com "$reference" >/dev/null
done < images.txt
