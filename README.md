# PR Pulse — Azure DevOps Pull Request Command Center

**Keep every code review on track with a real-time, organization-wide pull request dashboard built for Azure DevOps.**

PR Pulse gives engineering managers, tech leads, and delivery teams immediate visibility into the pull requests that are slowing down your releases. Highlight bottlenecks, surface aging reviews, and respond before work goes stale.

![Image](/images/mk/extension-overview.png)

## Overview

- **Platform**: Azure DevOps (Azure Repos)
- **Audience**: Engineering managers, team leads, DevOps champions
- **Use Cases**: PR triage, review coordination, service-level objectives for code reviews, cross-repo reporting

## Why Teams Choose PR Pulse

- **360° Pull Request Awareness** – Aggregate every active pull request across repositories and teams in a single hub, updated live with the Azure DevOps Extension SDK.
![Image](/images/mk/focus.png)

- **Built-in Aging Alerts** – Teal/orange severity badges flag PRs older than 2 or 5 days so you can rebalance reviewers before deadlines slip.
- **Repository-Level Focus** – Expand/collapse repo sections to zero in on the services that need attention; drill into draft PRs only when you need them.
- **Reviewer Accountability** – Each card shows creator name, profile image, branch flow, and time-in-review to make follow‑ups effortless.

## Feature Highlights

- **Ready vs. Draft Views** – Draft PRs are tucked away until you expand them, keeping the primary list focused on shippable work.
- **Visual Status Cues** – High-contrast cards, badges, and metrics echo the extension icon for quick scanning.
- **One-Click Deep Links** – Launch directly into the Azure Repos PR page to comment or complete a merge.
- **Org-Friendly Metrics** – Global counters show totals, warnings, and critical backlogs across the entire project.
- **Responsive & Accessible** – Keyboard-friendly toggles, lazy-loaded avatars, and responsive grids ensure the dashboard feels native inside Azure DevOps.

![Image](/images/mk/highlight.png)

## What You’ll See

- **Hero metrics** — Total active PRs, warning (2+ days), danger (5+ days) at a glance.
- **Repository cards** — Collapsible groups with counts for ready and draft reviews.
- **PR details** — Title, creator avatar and name, branch source/target, publish date, relative "active" time, quick Review button.
- **Draft drawers** — Optional, per-repo panels to inspect draft PRs without clutter.

![Image](/images/mk/metrics.png)

## Getting Started

1. **Install PR Pulse** from the Visual Studio Marketplace or your organization’s private gallery.
2. **Grant the extension** access to Azure DevOps when prompted (`vso.code` + `vso.settings` scopes).
3. Navigate to **Repos ➜ Pull Requests ➜ PR Pulse** in the Azure DevOps navigation.
4. Pin the hub to your project sidebar so the dashboard is one click away.

## Permissions & Security

- **`vso.code`** – Allows the dashboard to list repositories and pull requests so we can compute metrics and deep-link to PRs inside Azure Repos. Only read APIs are used.
- **`vso.settings`** – Lets PR Pulse read the authenticated user’s theme preference from Azure DevOps so the dashboard matches the host light/dark/high-contrast theme. No personal settings are modified.
- Honors Azure DevOps organization policies; no external services or telemetry calls.
- Profiles and avatars are rendered from existing Azure DevOps identity URLs and never leave your tenant.

## Works Great For

- Weekly PR triage rituals and stand-ups
- Maintaining engineering SLAs around review turnarounds
- Staff engineers monitoring multiple repositories
- Release managers seeking blockers before release branches cut

## Roadmap & Ideas

- Custom aging thresholds and color rules
- Filters by reviewer or area path
- Exportable review metrics for leadership reporting

Have feedback or want to see a new capability? Open an issue or reach out via the publisher contact on the Marketplace listing.

## Local Debugging

Run the extension straight from your workstation while iterating on the UI:

1. Install and trust mkcert’s local CA (required once per machine):
   ```bash
   brew install mkcert
   mkcert -install
   ```
2. Generate a local HTTPS certificate (`localhost-cert.pem` and `localhost-key.pem`) inside `dev-certs/`. Point the `DEV_CERT_PATH`/`DEV_KEY_PATH` env vars to alternate locations if you keep the files elsewhere.
   ```bash
   mkdir -p dev-certs
   mkcert -key-file dev-certs/localhost-key.pem -cert-file dev-certs/localhost-cert.pem 127.0.0.1 localhost
   ```
3. Start the static host with `npm run dev`. By default it serves the repository at `https://127.0.0.1:3000` with caching disabled.
4. Ensure `vss-extension.dev.json` has `baseUri` pointing at the origin from the previous step (the repo ships with the same default).
5. Publish the dev manifest (`scripts/publish-dev.sh`) so Azure DevOps pulls the assets from your machine while you debug.

Set `AZURE_DEVOPS_EXT_PAT` (scope: Extension Management) before running the publish script. The terminal prints the exact URL and highlights how to stop the server. Trust the certificate once in your browser so the Azure DevOps iframe can load it without warnings.

## Package & Publish

Need a `.vsix` for testing or release?

- **Dev channel:** `./scripts/publish-dev.sh` bumps the dev manifest, creates a VSIX, and publishes it privately to the signed-in account.
- **Manual package:**
  ```bash
  npx tfx-cli extension create --manifest-globs vss-extension.json --output-path dist
  ```
  The VSIX appears under `dist/`. Upload it through the Azure DevOps portal or the Marketplace publisher dashboard.

Remember to clean out `dist/*.vsix` after validating the package.

## Support

- **Publisher**: bacumi
- **Source Code**: [GitHub – PR Pulse](https://github.com/mihaibc/pr_dashboard)
- **Issues**: Use the GitHub issue tracker for bug reports and feature requests.

Make PR Pulse part of your Azure DevOps toolkit and keep reviews flowing from "Open" to "Merged" with confidence.
