# Changelog

## 1.0.12 - 2025-09-18
- Enhanced error handling to skip archived or inaccessible repositories while continuing to render accessible ones.
- Logged skipped repository names/IDs to aid administrators when diagnosing permission gaps.
- Added a collapsible “Skipped repositories” card and clearer empty-state messaging for permission-related scenarios.

## 1.0.11 - 2025-09-18
- Documented the new Azure DevOps theme permission (`vso.settings`) and updated README guidance for administrators.
- Clarified permission messaging in marketplace collateral.

## 1.0.10 - 2025-09-18
- Expanded theme synchronization to update card and surface colors from Azure DevOps theme variables across the entire dashboard.
- Confirmed packaging metadata for changelog and new scopes prior to Marketplace submission.

## 1.0.9 - 2025-09-18
- Fetched the signed-in user’s theme via Azure DevOps settings service for 100% alignment with their DevOps UI.
- Added changelog packaging so the Marketplace shows release notes alongside the extension.

## 1.0.8 - 2025-09-18
- Honored Azure DevOps theme signals exclusively (no OS overrides) so light/dark/high-contrast modes stay in sync.
- Polished light-mode variables to match the refined dynamic theming model.

## 1.0.7 - 2025-09-18
- Added automatic light/dark theme support that follows the Azure DevOps theme settings.
- Tuned colors for high-contrast readability across UI elements.

## 1.0.6 - 2025-09-18
- Marketplace metadata polish: tags, repository links, public flag, and README refresh.

## 1.0.5 - 2025-09-18
- Added creator avatars, draft grouping improvements, and reorganised PR sections.

## 1.0.4 - 2025-09-18
- Modernised UI layout with hero metrics, collapsible repositories, and draft drawers.

## 1.0.3 - 2025-09-18
- Switched to REST + access token flow to fix dynamic import errors.

## 1.0.2 - 2025-09-18
- Initial public-ready polish from basic dashboard prototype.

## 1.0.1 - 2025-09-18
- Early iteration updates.

## 1.0.0 - 2025-09-18
- Initial release.
