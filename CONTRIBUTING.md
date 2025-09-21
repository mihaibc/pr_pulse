# Contributing to PR Pulse

Thanks for taking the time to improve PR Pulse! This document outlines how to get a local environment running, coding expectations, and how to validate your changes before opening a pull request.

## Prerequisites

- Node.js 18+ (the tooling relies on native ES modules).
- npm (ships with Node.js).
- [mkcert](https://github.com/FiloSottile/mkcert) or another tool that can create a trusted localhost TLS certificate.
- An Azure DevOps Personal Access Token (PAT) with the **Extension Management** scope if you plan to publish the dev build.

## Install Dependencies

```bash
npm install
```

## Local HTTPS Dev Server

1. Trust mkcert's local CA once:
   ```bash
   mkcert -install
   ```
2. Create certificates (or point the `DEV_CERT_PATH`/`DEV_KEY_PATH` variables at your own):
   ```bash
   mkdir -p dev-certs
   mkcert -key-file dev-certs/localhost-key.pem -cert-file dev-certs/localhost-cert.pem 127.0.0.1 localhost
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   This serves the repository over `https://127.0.0.1:3000` with caching disabled so you can iterate quickly.
4. Confirm `vss-extension.dev.json` has `"baseUri": "https://127.0.0.1:3000"` (update it if you changed host/port).

While the server runs, load the PR Pulse hub inside Azure DevOps using the dev manifest (see next section) and trust the certificate in your browser the first time it loads.

## Publishing the Dev Extension

Set `AZURE_DEVOPS_EXT_PAT` in your shell or `.env` file. Then run:

```bash
./scripts/publish-dev.sh
```

The script bumps the patch version in `vss-extension.dev.json`, packages the extension, and publishes it to the signed-in account for private testing. After the script completes, visit the Azure DevOps organization where you shared the extension and open **Repos → Pull Requests → PR Pulse Dev** to see your local changes.

## Coding Standards

- Use modern JavaScript (ES2020+) and prefer functional, immutable patterns where possible.
- Keep UI changes accessible (ARIA roles, keyboard focus states, color contrast).
- Add succinct comments when a block of code is non-obvious; avoid inline commentary that states the obvious.
- Match the existing formatting and naming conventions.

## Verification Checklist

Before you submit a pull request:

- [ ] `npm run test`
- [ ] `npm run dev` to spot-check the UI in Azure DevOps
- [ ] Update documentation or changelog entries when behavior changes
- [ ] Ensure no secrets or certs are checked in (the `dev-certs/` directory is gitignored)

Thanks again for contributing!
