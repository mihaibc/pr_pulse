import {
    timeAgo,
    formatDateTime,
    formatDuration,
    formatBadgeDuration,
    classifyActiveDuration,
    trimTrailingSlash
} from "../helpers.js";
import { listActivePullRequests } from "./data.js";
import { fetchJson } from "./api.js";

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

function prWebUrl(repoWebUrl, pullRequestId) {
    if (!repoWebUrl || !pullRequestId) {
        return "";
    }
    return `${repoWebUrl}/pullrequest/${pullRequestId}`;
}

async function hydrateReviewers(pr, context) {
    const { repoId, projectBaseUrl, accessToken, reviewersList } = context;

    try {
        let reviewers = Array.isArray(pr.reviewers) ? pr.reviewers : [];
        if (!reviewers.length) {
            const reviewerData = await fetchJson(
                `${projectBaseUrl}/_apis/git/repositories/${repoId}/pullRequests/${pr.pullRequestId}/reviewers?api-version=7.1-preview.1`,
                accessToken,
                { context: `reviewers:${repoId}:${pr.pullRequestId}` }
            );
            reviewers = Array.isArray(reviewerData.value) ? reviewerData.value : [];
        }

        reviewersList.classList.remove("reviewer-list-empty");
        reviewersList.textContent = "";

        if (!reviewers.length) {
            reviewersList.classList.add("reviewer-list-empty");
            reviewersList.textContent = "No reviewers";
            return;
        }

        reviewers.forEach((reviewer) => {
            const chip = document.createElement("span");
            chip.className = "reviewer-chip";

            const img = document.createElement("img");
            img.src = reviewer.imageUrl || "";
            img.alt = reviewer.displayName || "Reviewer";
            img.loading = "lazy";
            chip.appendChild(img);

            const status = document.createElement("span");
            status.className = "reviewer-status";

            const vote = typeof reviewer.vote === "number" ? reviewer.vote : 0;
            if (vote >= 10) {
                chip.classList.add("reviewer-chip--approved");
                status.title = "Approved";
            } else if (vote <= -10) {
                chip.classList.add("reviewer-chip--rejected");
                status.title = "Rejected";
            } else {
                chip.classList.add("reviewer-chip--pending");
                status.title = "Waiting";
            }

            chip.appendChild(status);
            reviewersList.appendChild(chip);
        });
    } catch (error) {
        console.warn("Failed to load reviewers", error);
        reviewersList.classList.add("reviewer-list-empty");
        reviewersList.textContent = "Reviewers unavailable";
    }
}

function createPrListItem(pr, options) {
    const {
        now,
        repoWebUrl,
        metrics,
        includeInMetrics = true,
        markDraft = false,
        repoId,
        projectBaseUrl,
        accessToken,
        fetchDetails = false
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

    const supplementary = document.createElement("div");
    supplementary.className = "pr-supplementary";

    const reviewersContainer = document.createElement("div");
    reviewersContainer.className = "pr-reviewers";
    const reviewersLabel = document.createElement("span");
    reviewersLabel.className = "section-label";
    reviewersLabel.textContent = "Reviewers";
    const reviewersList = document.createElement("div");
    reviewersList.className = "reviewer-list reviewer-list-empty";
    reviewersList.textContent = fetchDetails ? "Loading…" : "Unavailable";
    reviewersContainer.append(reviewersLabel, reviewersList);
    supplementary.appendChild(reviewersContainer);

    prItem.append(prHeader, prMeta, supplementary, prFooter);

    if (fetchDetails && repoId && projectBaseUrl && accessToken) {
        hydrateReviewers(pr, {
            repoId,
            projectBaseUrl,
            accessToken,
            reviewersList
        }).catch((error) => {
            console.warn("Failed to hydrate reviewers", error);
            reviewersList.textContent = "Reviewers unavailable";
        });
    } else {
        supplementary.style.display = "none";
    }

    return prItem;
}

function appendEmptyState(prContainer, message, details) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `<strong>${message}</strong>${details ? `<span>${details}</span>` : ""}`;
    prContainer.appendChild(emptyState);
}

function appendSkippedRepos(prContainer, skippedRepos) {
    const skippedDetails = document.createElement("details");
    skippedDetails.className = "skipped-card";
    skippedDetails.open = false;

    const summary = document.createElement("summary");
    summary.textContent = `Skipped repositories (${skippedRepos.length})`;
    skippedDetails.appendChild(summary);

    const list = document.createElement("ul");
    skippedRepos.forEach((name) => {
        const item = document.createElement("li");
        item.textContent = name;
        list.appendChild(item);
    });
    skippedDetails.appendChild(list);
    prContainer.appendChild(skippedDetails);
}

export function setMetrics(values) {
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

export function updateTimestamp(date = new Date()) {
    if (!updatedAtChip) {
        return;
    }

    updatedAtChip.textContent = `Updated ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    updatedAtChip.title = date.toLocaleString();
}

export async function renderRepositoryGroups({ repositories, prContainer, now, projectBaseUrl, accessToken }) {
    if (!prContainer) {
        return { metrics: { total: 0, warning: 0, danger: 0 }, skippedRepos: [], hasAnyPrs: false };
    }

    const metrics = { total: 0, warning: 0, danger: 0 };
    const skippedRepos = [];
    let hasAnyPrs = false;
    const BATCH_SIZE = 5;

    prContainer.innerHTML = "";

    const renderRepository = (entry) => {
        const activePrs = (entry.prs || []).filter((pr) => {
            if (!pr) {
                return false;
            }
            const status = typeof pr.status === "string" ? pr.status.toLowerCase() : "active";
            return status === "active";
        });

        if (!activePrs.length) {
            return null;
        }

        const readyPrs = [];
        const draftPrs = [];
        activePrs.forEach((pr) => (pr && pr.isDraft ? draftPrs : readyPrs).push(pr));

        if (!readyPrs.length && !draftPrs.length) {
            return null;
        }

        hasAnyPrs = true;

        const repoGroup = document.createElement("details");
        repoGroup.className = "repo-group";
        repoGroup.open = true;

        const repoHeader = document.createElement("summary");
        repoHeader.className = "repo-header";

        const repoTitle = document.createElement("span");
        repoTitle.textContent = entry.repo.name;

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
        const repoWebUrl = entry.repo.webUrl ? trimTrailingSlash(entry.repo.webUrl) : "";

        if (readyPrs.length) {
            const readyList = document.createElement("ul");
            readyList.className = "pr-list";
            readyPrs.forEach((pr) => {
                readyList.appendChild(
                    createPrListItem(pr, {
                        now,
                        repoWebUrl,
                        metrics,
                        includeInMetrics: true,
                        markDraft: false,
                        repoId: entry.repo.id,
                        projectBaseUrl,
                        accessToken,
                        fetchDetails: true
                    })
                );
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
                draftsList.appendChild(
                    createPrListItem(pr, {
                        now,
                        repoWebUrl,
                        metrics,
                        includeInMetrics: false,
                        markDraft: true,
                        repoId: entry.repo.id,
                        projectBaseUrl,
                        accessToken,
                        fetchDetails: true
                    })
                );
            });
            draftsDetails.appendChild(draftsList);
            repoContent.appendChild(draftsDetails);
        }

        repoGroup.append(repoHeader, repoContent);
        return repoGroup;
    };

    for (let i = 0; i < repositories.length; i += BATCH_SIZE) {
        const batch = repositories.slice(i, i + BATCH_SIZE);
        const batchFragment = document.createDocumentFragment();

        await Promise.all(
            batch.map(async (repo) => {
                if (repo.isDisabled || repo.isInMaintenance) {
                    skippedRepos.push(repo.name || repo.id);
                    return;
                }
                try {
                    const prs = await listActivePullRequests(projectBaseUrl, repo.id, accessToken);
                    const entry = { repo, prs };
                    const node = renderRepository(entry);
                    if (node) {
                        batchFragment.appendChild(node);
                    }
                } catch (repoError) {
                    const repoName = repo.name || repo.id;
                    console.warn(`Skipping repository ${repoName}:`, repoError);
                    skippedRepos.push(repoName);
                }
            })
        );

        if (batchFragment.childNodes.length) {
            prContainer.appendChild(batchFragment);
            setMetrics(metrics);
            updateTimestamp(new Date());
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (!hasAnyPrs) {
        const message = skippedRepos.length === repositories.length
            ? "No accessible repositories"
            : "No active pull requests 🎉";
        const details = skippedRepos.length === repositories.length
            ? "You may not have permission to view pull requests in this project."
            : "Everything is up to date. Check back later for new activity.";
        appendEmptyState(prContainer, message, details);
    }

    if (skippedRepos.length) {
        appendSkippedRepos(prContainer, skippedRepos);
    }

    setMetrics(metrics);
    updateTimestamp(new Date());

    return { metrics, skippedRepos, hasAnyPrs };
}
