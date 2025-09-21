import { fetchJson } from "./api.js";

export const API_VERSION = "7.1-preview.1";

export async function listRepositories(projectBaseUrl, accessToken, apiVersion = API_VERSION) {
    const repoData = await fetchJson(
        `${projectBaseUrl}/_apis/git/repositories?api-version=${apiVersion}`,
        accessToken,
        { context: "repositories" }
    );
    return Array.isArray(repoData.value) ? repoData.value : [];
}

export async function listActivePullRequests(projectBaseUrl, repoId, accessToken, apiVersion = API_VERSION) {
    const prData = await fetchJson(
        `${projectBaseUrl}/_apis/git/pullrequests?searchCriteria.repositoryId=${repoId}&searchCriteria.status=active&api-version=${apiVersion}`,
        accessToken,
        { context: `pullrequests:${repoId}` }
    );
    return Array.isArray(prData.value) ? prData.value : [];
}
