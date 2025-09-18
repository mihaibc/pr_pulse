import * as SDK from "./lib/SDK.js";
import {
    timeAgo,
    formatDateTime,
    formatDuration,
    formatBadgeDuration,
    classifyActiveDuration,
    trimTrailingSlash,
    resolveOrganizationUrl
} from "./helpers.js";

const THEME_CLASS_LIGHT = "pr-theme-light";
const THEME_CLASS_DARK = "pr-theme-dark";
const THEME_CLASS_HIGH_CONTRAST = "pr-theme-high-contrast";
let themeHandlingInitialized = false;
let cachedThemeName = "";
let customThemeStyleElement;

SDK.init({ applyTheme: true, loaded: false });

function determineThemeName(themeData) {
    if (typeof themeData === "string") {
        return themeData;
    }
    if (themeData && typeof themeData === "object") {
        return (
            themeData.themeName ||
            themeData.name ||
            themeData.id ||
            (themeData.baseTheme && themeData.baseTheme.name) ||
            ""
        );
    }
    const attr = document.body.getAttribute("data-vss-theme") || document.body.dataset.vssTheme;
    if (attr) {
        return attr;
    }
    const hostThemeClass = Array.from(document.body.classList).find((cls) => cls.startsWith("theme-"));
    return hostThemeClass || "";
}

function updateCustomThemeVariables(themeData) {
    const rootStyle = document.documentElement.style;
    const computed = getComputedStyle(document.documentElement);

    const findThemeValue = (data, keys, cssVars, fallback) => {
        if (data) {
            for (const key of keys) {
                const value = data[key];
                if (typeof value === "string" && value.trim()) {
                    return value.trim();
                }
            }
        }
        for (const cssVar of cssVars) {
            const value = computed.getPropertyValue(cssVar);
            if (value && value.trim()) {
                return value.trim();
            }
        }
        return fallback;
    };

    const map = {
        "--canvas": findThemeValue(themeData, [
            "backgroundColor",
            "background-color",
            "pageBackgroundColor",
            "page-background-color",
            "bodyBackgroundColor",
            "primaryBackgroundColor"
        ], ["--backgroundColor", "--background-color", "--pageBackgroundColor"], "#f3f2f1"),
        "--surface": findThemeValue(themeData, [
            "cardBackgroundColor",
            "card-background-color",
            "panelBackgroundColor",
            "surfaceColor"
        ], ["--cardBackgroundColor", "--card-background-color", "--surfaceColor"], "#ffffff"),
        "--surface-subtle": findThemeValue(themeData, [
            "cardBackgroundColorLighter",
            "backgroundColorLighter",
            "pageBackgroundColorLighter"
        ], ["--cardBackgroundColorLighter", "--backgroundColorLighter"], "#f4f7f8"),
        "--border": findThemeValue(themeData, [
            "cardBorderColor",
            "dividerColor",
            "surfaceBorderColor"
        ], ["--cardBorderColor", "--dividerColor"], "rgba(15, 23, 42, 0.08)"),
        "--text-primary": findThemeValue(themeData, [
            "textPrimaryColor",
            "text-primary-color",
            "textColor"
        ], ["--text-primary-color", "--textPrimaryColor", "--textColor"], "#1f2933"),
        "--text-muted": findThemeValue(themeData, [
            "textSecondaryColor",
            "text-muted-color",
            "textSecondary"
        ], ["--text-secondary-color", "--textSecondaryColor"], "#52606d"),
        "--brand": findThemeValue(themeData, [
            "primaryColor",
            "primary-color",
            "brandPrimaryColor"
        ], ["--primaryColor", "--primary-color"], "#00897b"),
        "--brand-dark": findThemeValue(themeData, [
            "primaryColorDarker",
            "primaryColorDark"
        ], ["--primaryColorDarker"], "#00695c"),
        "--accent": findThemeValue(themeData, [
            "accentColor",
            "accent-color"
        ], ["--accentColor", "--accent-color"], "#ff6f3c"),
        "--accent-dark": findThemeValue(themeData, [
            "accentColorDarker",
            "accentColorDark"
        ], ["--accentColorDarker"], "#d94f1b")
    };

    const ensureStyle = () => {
        if (!customThemeStyleElement) {
            customThemeStyleElement = document.createElement("style");
            customThemeStyleElement.type = "text/css";
            document.head.appendChild(customThemeStyleElement);
        }
        return customThemeStyleElement;
    };

    const styleElement = ensureStyle();
    const declarations = Object.entries(map)
        .filter(([, value]) => typeof value === "string" && value)
        .map(([name, value]) => `${name}: ${value}`)
        .join("; ");
    styleElement.innerText = declarations ? `:root { ${declarations} }` : "";

    if (map["--text-primary"]) {
        rootStyle.setProperty("color", map["--text-primary"]);
    }
}

function applyThemeClass(themeData) {
    const themeName = determineThemeName(themeData);
    if (!themeName && cachedThemeName) {
        return;
    }

    if (themeName) {
        cachedThemeName = themeName;
    }

    const normalized = (themeName || "").toLowerCase();
    let isDark = false;
    let isHighContrast = false;

    const bodyClasses = document.body.classList;

    if (bodyClasses.contains("theme-high-contrast") || normalized.includes("high-contrast")) {
        isHighContrast = true;
    }

    if (bodyClasses.contains("theme-dark")) {
        isDark = true;
    } else if (bodyClasses.contains("theme-light")) {
        isDark = false;
    } else if (normalized.includes("dark") || normalized.includes("night")) {
        isDark = true;
    } else if (normalized.includes("light")) {
        isDark = false;
    } else if (themeData && typeof themeData === "object" && "isDark" in themeData) {
        isDark = Boolean(themeData.isDark);
    }

    if (isHighContrast) {
        isDark = true;
    }

    document.body.classList.toggle(THEME_CLASS_DARK, isDark);
    document.body.classList.toggle(THEME_CLASS_LIGHT, !isDark);
    document.body.classList.toggle(THEME_CLASS_HIGH_CONTRAST, isHighContrast);

    updateCustomThemeVariables(typeof themeData === "object" ? themeData : undefined);
}

async function fetchUserTheme(accountUri, accessToken) {
    try {
        if (!accountUri || !accessToken) {
            return "";
        }
        const url = `${trimTrailingSlash(accountUri)}/_apis/settings/entries/me/WebPlatform?api-version=7.1-preview.1`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-VSS-ForceMsaPassThrough": "true"
            }
        });
        if (!response.ok) {
            return "";
        }
        const json = await response.json();
        const theme = json?.value?.Theme || json?.value?.theme;
        return typeof theme === "string" ? theme : "";
    } catch (error) {
        console.error("Failed to fetch user theme", error);
        return "";
    }
}

function setupThemeHandling() {
    if (themeHandlingInitialized) {
        return;
    }
    themeHandlingInitialized = true;
    applyThemeClass();
    window.addEventListener("themeChanged", (event) => {
        applyThemeClass(event?.detail?.data);
    });
    window.addEventListener("themeApplied", (event) => {
        applyThemeClass(event?.detail);
    });
}

setupThemeHandling();

const metricEls = {
    total: document.getElementById("metric-total"),
    warning: document.getElementById("metric-warning"),
    danger: document.getElementById("metric-danger")
};
const updatedAtChip = document.getElementById("updated-at");

function createBadge(level, text, title) {
    const badge = document.createElement("span");
    badge.className = `badge ${level}`;
    badge.textContent = text;
    if (title) {
        badge.title = title;
    }
    return badge;
}

function createMetaRow(label, value, title) {
    const row = document.createElement("div");
    row.className = "pr-meta-row";

    const labelEl = document.createElement("span");
    labelEl.className = "pr-meta-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "pr-meta-value";

    if (value instanceof Node) {
        valueEl.appendChild(value);
    } else {
        valueEl.textContent = value;
    }

    if (title) {
        valueEl.title = title;
    }

    row.append(labelEl, valueEl);
    return row;
}

function buildBranchFlow(source, target) {
    const flow = document.createElement("span");
    flow.className = "branch-flow";

    const sourceChip = document.createElement("span");
    sourceChip.className = "branch-chip";
    sourceChip.textContent = source || "unknown";

    const arrow = document.createElement("span");
    arrow.textContent = "→";

    const targetChip = document.createElement("span");
    targetChip.className = "branch-chip";
    targetChip.textContent = target || "unknown";

    flow.append(sourceChip, arrow, targetChip);
    return flow;
}

function createPrListItem(pr, options) {
    const {
        now,
        repoWebUrl,
        metrics,
        includeInMetrics = true,
        markDraft = false
    } = options;

    const prItem = document.createElement("li");
    prItem.className = "pr-item";
    if (markDraft) {
        prItem.classList.add("is-draft");
    }

    const publishedDate = pr.creationDate ? new Date(pr.creationDate) : null;
    const publishedValid = publishedDate && !Number.isNaN(publishedDate.getTime());
    const activeSince = publishedValid ? publishedDate : null;
    const activeMs = activeSince ? Math.max(0, now.getTime() - activeSince.getTime()) : 0;
    const severity = classifyActiveDuration(activeMs);

    if (severity.level === "warning") {
        if (includeInMetrics && metrics) {
            metrics.warning += 1;
        }
        prItem.classList.add("severity-warning");
    } else if (severity.level === "danger") {
        if (includeInMetrics && metrics) {
            metrics.danger += 1;
            metrics.warning += 1;
        }
        prItem.classList.add("severity-danger");
    }

    if (includeInMetrics && metrics) {
        metrics.total += 1;
    }

    const prHeader = document.createElement("div");
    prHeader.className = "pr-card-header";

    const reviewUrl = prWebUrl(repoWebUrl, pr.pullRequestId);
    const prTitle = document.createElement(reviewUrl ? "a" : "span");
    prTitle.className = "pr-title";
    prTitle.textContent = pr.title || "Untitled pull request";

    if (prTitle instanceof HTMLAnchorElement && reviewUrl) {
        prTitle.href = reviewUrl;
        prTitle.target = "_blank";
        prTitle.rel = "noopener";
    }

    const badgeGroup = document.createElement("div");
    badgeGroup.className = "pr-badges";

    if (markDraft) {
        badgeGroup.appendChild(createBadge("draft", "Draft", "This pull request is still marked as draft"));
    }

    const badgeText = `Active ${formatBadgeDuration(activeMs)}`;
    const badge = createBadge(severity.level, badgeText, severity.description);
    badgeGroup.appendChild(badge);

    prHeader.append(prTitle, badgeGroup);

    const prMeta = document.createElement("div");
    prMeta.className = "pr-meta";

    const creatorContent = document.createElement("span");
    creatorContent.className = "creator-info";

    if (pr.createdBy && pr.createdBy.imageUrl) {
        const avatar = document.createElement("img");
        avatar.className = "avatar";
        avatar.src = pr.createdBy.imageUrl;
        avatar.alt = `${pr.createdBy.displayName || "Author"}'s avatar`;
        avatar.loading = "lazy";
        avatar.width = 28;
        avatar.height = 28;
        creatorContent.appendChild(avatar);
    }

    const creatorName = document.createElement("span");
    creatorName.textContent = pr.createdBy ? pr.createdBy.displayName : "Unknown";
    creatorContent.appendChild(creatorName);

    const creatorRow = createMetaRow("Creator", creatorContent);

    const sourceBranch = (pr.sourceRefName || "").replace("refs/heads/", "");
    const targetBranch = (pr.targetRefName || "").replace("refs/heads/", "");
    const branchRow = createMetaRow("Branches", buildBranchFlow(sourceBranch, targetBranch));

    let publishedValue;
    if (publishedValid) {
        publishedValue = document.createElement("span");
        publishedValue.textContent = formatDateTime(publishedDate);
        const relative = document.createElement("span");
        relative.className = "text-subtle";
        relative.textContent = ` (${timeAgo(publishedDate)})`;
        publishedValue.appendChild(relative);
    } else {
        publishedValue = "Unknown";
    }

    const publishedRow = createMetaRow(
        "Published",
        publishedValue,
        publishedValid ? publishedDate.toISOString() : undefined
    );

    let activeValue;
    if (publishedValid) {
        activeValue = document.createElement("span");
        activeValue.textContent = formatDuration(activeMs);
        const since = document.createElement("span");
        since.className = "text-subtle";
        since.textContent = ` (since ${timeAgo(publishedDate)})`;
        activeValue.appendChild(since);
    } else {
        activeValue = formatDuration(activeMs);
    }

    const activeRow = createMetaRow("Active for", activeValue, severity.description);

    prMeta.append(creatorRow, branchRow, publishedRow, activeRow);

    const prFooter = document.createElement("div");
    prFooter.className = "pr-footer";

    const reviewButton = document.createElement("a");
    reviewButton.className = "review-button";
    reviewButton.textContent = "Review";

    if (reviewUrl) {
        reviewButton.href = reviewUrl;
        reviewButton.target = "_blank";
        reviewButton.rel = "noopener";
    } else {
        reviewButton.href = "#";
        reviewButton.setAttribute("aria-disabled", "true");
    }

    prFooter.appendChild(reviewButton);

    prItem.append(prHeader, prMeta, prFooter);
    return prItem;
}

function setMetrics(values) {
    const { total = 0, warning = 0, danger = 0 } = values;

    if (metricEls.total) {
        metricEls.total.textContent = total;
    }
    if (metricEls.warning) {
        metricEls.warning.textContent = warning;
    }
    if (metricEls.danger) {
        metricEls.danger.textContent = danger;
    }
}

function updateTimestamp(date = new Date()) {
    if (!updatedAtChip) {
        return;
    }

    updatedAtChip.textContent = `Updated ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    updatedAtChip.title = date.toLocaleString();
}

async function fetchJson(url, accessToken) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-VSS-ForceMsaPassThrough": "true"
        }
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`${response.status} ${response.statusText}${message ? ` - ${message}` : ""}`);
    }

    return response.json();
}

async function loadPullRequests() {
    await SDK.ready();
    applyThemeClass();

    const prContainer = document.getElementById("pr-container");
    const loadingIndicator = document.getElementById("loading");
    const now = new Date();

    try {
        const accessToken = await SDK.getAccessToken();
        const webContext = SDK.getWebContext();
        const hostContext = SDK.getHost();
        const project = webContext && webContext.project;
        const accountUri = resolveOrganizationUrl(webContext, hostContext);

        if (!project || (!project.name && !project.id)) {
            throw new Error("Project context is not available.");
        }

        if (!accountUri) {
            throw new Error("Organization context is not available.");
        }

        if (!cachedThemeName) {
            const fetchedTheme = await fetchUserTheme(accountUri, accessToken);
            if (fetchedTheme) {
                applyThemeClass(fetchedTheme);
            }
        }

        const projectIdentifier = project.name || project.id;
        const projectBaseUrl = `${trimTrailingSlash(accountUri)}/${encodeURIComponent(projectIdentifier)}`;
        const apiVersion = "7.1-preview.1";

        const repoData = await fetchJson(`${projectBaseUrl}/_apis/git/repositories?api-version=${apiVersion}`, accessToken);
        const repositories = Array.isArray(repoData.value) ? repoData.value : [];

        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        if (repositories.length === 0) {
            prContainer.innerHTML = '<div class="empty-state"><strong>No repositories found.</strong><span>Add a repository or adjust project context to see pull requests.</span></div>';
            setMetrics({ total: 0, warning: 0, danger: 0 });
            updateTimestamp(now);
            SDK.notifyLoadSucceeded();
            return;
        }

        const repoPromises = repositories.map(async (repo) => {
            const prUrl = `${projectBaseUrl}/_apis/git/pullrequests?searchCriteria.repositoryId=${repo.id}&searchCriteria.status=active&api-version=${apiVersion}`;
            const prData = await fetchJson(prUrl, accessToken);
            return { repo, prs: Array.isArray(prData.value) ? prData.value : [] };
        });

        const results = await Promise.all(repoPromises);
        results.sort((a, b) => a.repo.name.localeCompare(b.repo.name));

        prContainer.innerHTML = "";

        const metrics = { total: 0, warning: 0, danger: 0 };
        let hasAnyPrs = false;

        const fragment = document.createDocumentFragment();

        for (const result of results) {
            const activePrs = result.prs.filter((pr) => {
                if (!pr) {
                    return false;
                }

                const status = typeof pr.status === "string" ? pr.status.toLowerCase() : "active";
                return status === "active";
            });

            if (!activePrs.length) {
                continue;
            }

            const readyPrs = [];
            const draftPrs = [];

            activePrs.forEach((pr) => {
                if (pr && pr.isDraft) {
                    draftPrs.push(pr);
                } else {
                    readyPrs.push(pr);
                }
            });

            if (!readyPrs.length && !draftPrs.length) {
                continue;
            }

            hasAnyPrs = true;

            const repoGroup = document.createElement("details");
            repoGroup.className = "repo-group";
            repoGroup.open = true;

            const repoHeader = document.createElement("summary");
            repoHeader.className = "repo-header";

            const repoTitle = document.createElement("span");
            repoTitle.textContent = result.repo.name;

            const repoCounts = document.createElement("div");
            repoCounts.className = "repo-counts";

            const readyCount = document.createElement("span");
            readyCount.className = "repo-count ready";
            readyCount.innerHTML = `<strong>${readyPrs.length}</strong> ${readyPrs.length === 1 ? "ready PR" : "ready PRs"}`;
            repoCounts.appendChild(readyCount);

            if (draftPrs.length) {
                const draftCount = document.createElement("span");
                draftCount.className = "repo-count draft";
                draftCount.innerHTML = `<strong>${draftPrs.length}</strong> ${draftPrs.length === 1 ? "draft" : "drafts"}`;
                repoCounts.appendChild(draftCount);
            }

            repoHeader.append(repoTitle, repoCounts);

            const repoContent = document.createElement("div");
            repoContent.className = "repo-content";

            const repoWebUrl = result.repo.webUrl ? trimTrailingSlash(result.repo.webUrl) : "";

            if (readyPrs.length) {
                const readyList = document.createElement("ul");
                readyList.className = "pr-list";
                readyPrs.forEach((pr) => {
                    const item = createPrListItem(pr, {
                        now,
                        repoWebUrl,
                        metrics,
                        includeInMetrics: true,
                        markDraft: false
                    });
                    readyList.appendChild(item);
                });
                repoContent.appendChild(readyList);
            } else {
                const emptyReady = document.createElement("div");
                emptyReady.className = "empty-subsection";
                emptyReady.textContent = "No ready pull requests.";
                repoContent.appendChild(emptyReady);
            }

            if (draftPrs.length) {
                const draftsDetails = document.createElement("details");
                draftsDetails.className = "drafts-section";
                draftsDetails.open = false;

                const draftsSummary = document.createElement("summary");
                draftsSummary.textContent =
                    draftPrs.length === 1 ? "1 draft pull request" : `${draftPrs.length} draft pull requests`;
                draftsDetails.appendChild(draftsSummary);

                const draftsList = document.createElement("ul");
                draftsList.className = "pr-list pr-list-drafts";
                draftPrs.forEach((pr) => {
                    const item = createPrListItem(pr, {
                        now,
                        repoWebUrl,
                        metrics,
                        includeInMetrics: false,
                        markDraft: true
                    });
                    draftsList.appendChild(item);
                });
                draftsDetails.appendChild(draftsList);
                repoContent.appendChild(draftsDetails);
            }

            repoGroup.append(repoHeader, repoContent);
            fragment.appendChild(repoGroup);
        }

        if (!hasAnyPrs) {
            prContainer.innerHTML = '<div class="empty-state"><strong>No active pull requests 🎉</strong><span>Everything is up to date. Check back later for new activity.</span></div>';
            setMetrics({ total: 0, warning: 0, danger: 0 });
            updateTimestamp(now);
            SDK.notifyLoadSucceeded();
            return;
        }

        prContainer.appendChild(fragment);
        setMetrics(metrics);
        updateTimestamp(now);
        SDK.notifyLoadSucceeded();
    } catch (error) {
        console.error(error);
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        if (prContainer) {
            prContainer.innerHTML = `<div class="error-state">Error loading pull requests: ${error.message}</div>`;
        }
        setMetrics({ total: 0, warning: 0, danger: 0 });
        updateTimestamp(now);
        SDK.notifyLoadSucceeded();
    }
}

function prWebUrl(repoWebUrl, pullRequestId) {
    if (!repoWebUrl || !pullRequestId) {
        return "";
    }
    return `${repoWebUrl}/pullrequest/${pullRequestId}`;
}

loadPullRequests().catch((error) => {
    console.error(error);
});
