#!/usr/bin/env bash
set -euo pipefail

MANIFEST="${1:-vss-extension.dev.json}"

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required. Please install Node.js and npm." >&2
  exit 1
fi

if [ -z "${AZURE_DEVOPS_EXT_PAT:-}" ]; then
  cat <<MSG >&2
Set the \$AZURE_DEVOPS_EXT_PAT environment variable to a Personal Access Token with
"Extension Management" scope before running this script.
Alternatively, add the PAT to an .env file and source it in your shell.
MSG
  exit 1
fi

if [ ! -f "$MANIFEST" ]; then
  echo "Manifest file '$MANIFEST' not found." >&2
  exit 1
fi

NEW_VERSION=$(node - "$MANIFEST" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('Manifest path missing');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
const parts = manifest.version ? manifest.version.split('.').map(n => parseInt(n, 10) || 0) : [0, 0, 0];
while (parts.length < 3) parts.push(0);
parts[2] += 1;
manifest.version = parts.join('.');
fs.writeFileSync(path, JSON.stringify(manifest, null, 2));
process.stdout.write(manifest.version);
NODE
)

echo "Bumped $MANIFEST to version $NEW_VERSION"

echo "Packaging dev extension..."
npx tfx-cli extension create \
  --manifest-globs "$MANIFEST" \
  --output-path dist

echo "Publishing dev extension..."
npx tfx-cli extension publish \
  --vsix dist/*.vsix \
  --publisher "bacumi" \
  --no-wait-validation \
  --share-with "@currentUser" \
  --token "$AZURE_DEVOPS_EXT_PAT"

rm -f dist/*.vsix
