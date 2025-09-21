import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

async function withRenderers(callback) {
    const html = `<!DOCTYPE html><html><body>
        <span id="metric-total">0</span>
        <span id="metric-warning">0</span>
        <span id="metric-danger">0</span>
        <span id="updated-at"></span>
        <div id="pr-container"></div>
    </body></html>`;

    const dom = new JSDOM(html, { url: 'https://dev.azure.com/contoso/project' });
    const { window } = dom;

    const globals = {
        window,
        document: window.document,
        Node: window.Node,
        HTMLElement: window.HTMLElement,
        HTMLAnchorElement: window.HTMLAnchorElement
    };

    const original = {
        window: global.window,
        document: global.document,
        Node: global.Node,
        HTMLElement: global.HTMLElement,
        HTMLAnchorElement: global.HTMLAnchorElement,
        fetch: global.fetch
    };

    Object.assign(global, globals);

    try {
        const renderers = await import('../src/renderers.js');
        await callback({ dom, renderers });
    } finally {
        if (original.fetch === undefined) {
            delete global.fetch;
        } else {
            global.fetch = original.fetch;
        }
        for (const key of Object.keys(globals)) {
            if (original[key] === undefined) {
                delete global[key];
            } else {
                global[key] = original[key];
            }
        }
        dom.window.close();
    }
}

function createJsonResponse(body) {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => body,
        text: async () => JSON.stringify(body)
    };
}

async function testRenderRepositoryGroups() {
    await withRenderers(async ({ renderers }) => {
        const { renderRepositoryGroups, setMetrics } = renderers;
        const prContainer = document.getElementById('pr-container');
        const now = new Date('2024-01-01T12:00:00Z');

        const projectBaseUrl = 'https://dev.azure.com/contoso/project';
        const repoId = 'repo-1';
        const prId = 42;

        const responses = new Map();
        const prsResponse = {
            value: [
                {
                    pullRequestId: prId,
                    title: 'Improve documentation',
                    creationDate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                    sourceRefName: 'refs/heads/docs',
                    targetRefName: 'refs/heads/main',
                    createdBy: {
                        displayName: 'Mia Reviewer',
                        imageUrl: 'https://example.com/avatar.png'
                    },
                    reviewers: []
                }
            ]
        };
        const reviewersResponse = {
            value: [
                {
                    displayName: 'Alex Approver',
                    vote: 10,
                    imageUrl: 'https://example.com/reviewer.png'
                }
            ]
        };

        const prsUrl = `${projectBaseUrl}/_apis/git/pullrequests?searchCriteria.repositoryId=${repoId}&searchCriteria.status=active&api-version=7.1-preview.1`;
        const reviewersUrl = `${projectBaseUrl}/_apis/git/repositories/${repoId}/pullRequests/${prId}/reviewers?api-version=7.1-preview.1`;
        responses.set(prsUrl, createJsonResponse(prsResponse));
        responses.set(reviewersUrl, createJsonResponse(reviewersResponse));

        global.fetch = async (url) => {
            const response = responses.get(url);
            if (!response) {
                throw new Error(`Unexpected fetch for ${url}`);
            }
            return response;
        };

        const repositories = [
            {
                id: repoId,
                name: 'Docs Repo',
                webUrl: 'https://dev.azure.com/contoso/project/_git/docs'
            }
        ];

        await renderRepositoryGroups({
            repositories,
            prContainer,
            now,
            projectBaseUrl,
            accessToken: 'token'
        });

        assert.equal(document.querySelectorAll('.repo-group').length, 1);
        assert.equal(document.querySelectorAll('.pr-item').length, 1);
        assert.equal(document.querySelector('.reviewer-chip--approved') !== null, true);
        assert.equal(document.getElementById('metric-total').textContent, '1');

        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(prContainer.querySelector('.reviewer-chip--approved span.reviewer-status').title, 'Approved');

        const updatedText = document.getElementById('updated-at').textContent;
        assert.ok(updatedText.startsWith('Updated '));

        setMetrics({ total: 0, warning: 0, danger: 0 });
        assert.equal(document.getElementById('metric-total').textContent, '0');
    });
}

async function run() {
    await testRenderRepositoryGroups();
}

run()
    .then(() => {
        console.log('All UI tests passed');
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
