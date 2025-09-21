import * as SDK from "./lib/SDK.js";
import { trimTrailingSlash, resolveOrganizationUrl } from "./helpers.js";
import { setupThemeHandling, applyThemeClass, fetchUserTheme, getCachedThemeName } from "./src/theme.js";
import { listRepositories } from "./src/data.js";
import { renderRepositoryGroups, setMetrics, updateTimestamp } from "./src/renderers.js";

SDK.init({ applyTheme: true, loaded: false });
setupThemeHandling();

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

        if (!getCachedThemeName()) {
            const fetchedTheme = await fetchUserTheme(accountUri, accessToken);
            if (fetchedTheme) {
                applyThemeClass(fetchedTheme);
            }
        }

        const projectIdentifier = project.name || project.id;
        const projectBaseUrl = `${trimTrailingSlash(accountUri)}/${encodeURIComponent(projectIdentifier)}`;

        let repositories = [];
        try {
            repositories = await listRepositories(projectBaseUrl, accessToken);
        } catch (repoListError) {
            console.error("Failed to list repositories", repoListError);
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            if (prContainer) {
                prContainer.innerHTML = `<div class="error-state">Unable to load repositories: ${repoListError.message}</div>`;
            }
            setMetrics({ total: 0, warning: 0, danger: 0 });
            updateTimestamp(now);
            SDK.notifyLoadSucceeded();
            return;
        }

        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        if (!repositories.length) {
            if (prContainer) {
                prContainer.innerHTML = '<div class="empty-state"><strong>No repositories found.</strong><span>Add a repository or adjust project context to see pull requests.</span></div>';
            }
            setMetrics({ total: 0, warning: 0, danger: 0 });
            updateTimestamp(now);
            SDK.notifyLoadSucceeded();
            return;
        }

        await renderRepositoryGroups({
            repositories,
            prContainer,
            now,
            projectBaseUrl,
            accessToken
        });

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

loadPullRequests().catch((error) => {
    console.error(error);
});

const refreshButton = document.getElementById("refresh-button");
if (refreshButton) {
    refreshButton.addEventListener("click", () => {
        loadPullRequests().catch((error) => {
            console.error(error);
        });
    });
}
