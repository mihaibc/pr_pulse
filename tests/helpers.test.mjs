import assert from 'node:assert/strict';
import {
    WARNING_THRESHOLD_MS,
    DANGER_THRESHOLD_MS,
    timeAgo,
    formatDuration,
    formatBadgeDuration,
    classifyActiveDuration,
    trimTrailingSlash,
    resolveOrganizationUrl
} from '../helpers.js';

function testTrimTrailingSlash() {
    assert.equal(trimTrailingSlash('https://dev.azure.com/org/'), 'https://dev.azure.com/org');
    assert.equal(trimTrailingSlash('https://dev.azure.com/org'), 'https://dev.azure.com/org');
    assert.equal(trimTrailingSlash(undefined), '');
    assert.equal(trimTrailingSlash('   https://contoso.visualstudio.com/  '), 'https://contoso.visualstudio.com');
    assert.equal(trimTrailingSlash('<script>alert(1)</script>'), '<script>alert(1)</script>');
}

function testClassifyActiveDuration() {
    assert.equal(classifyActiveDuration(NaN).level, 'info');
    assert.equal(classifyActiveDuration(WARNING_THRESHOLD_MS - 1).level, 'info');
    assert.equal(classifyActiveDuration(WARNING_THRESHOLD_MS).level, 'warning');
    assert.equal(classifyActiveDuration(DANGER_THRESHOLD_MS).level, 'danger');
    const negative = classifyActiveDuration(-1000);
    assert.equal(negative.level, 'info');
    assert.match(negative.description, /unavailable/i);
}

function testFormatBadgeDuration() {
    assert.equal(formatBadgeDuration(30 * 1000), '<1m');
    assert.equal(formatBadgeDuration(5 * 60 * 1000), '5m');
    assert.equal(formatBadgeDuration(2 * 60 * 60 * 1000), '2h');
    assert.equal(formatBadgeDuration(3 * 24 * 60 * 60 * 1000), '3d');
    assert.equal(formatBadgeDuration(-1), '<1m');
}

function testFormatDuration() {
    assert.equal(formatDuration(45 * 1000), '45 seconds');
    assert.equal(formatDuration(61 * 1000), '1 minute');
    assert.equal(formatDuration(2 * 60 * 60 * 1000), '2 hours');
    assert.equal(formatDuration((2 * 24 * 60 * 60 + 3 * 60 * 60) * 1000), '2 days, 3 hours');
    assert.equal(formatDuration(-1), 'moments');
}

function testResolveOrganizationUrl() {
    const webContext = { account: { uri: 'https://example.visualstudio.com/' } };
    assert.equal(resolveOrganizationUrl(webContext, {}), 'https://example.visualstudio.com');

    const fallbackContext = { account: { name: 'my-org' } };
    assert.equal(resolveOrganizationUrl(fallbackContext, {}), 'https://dev.azure.com/my-org');

    const locationLike = { origin: 'https://dev.azure.com', pathname: '/contoso/_apps/hub' };
    assert.equal(resolveOrganizationUrl({}, {}, locationLike), 'https://dev.azure.com/contoso');

    const onPremHost = { name: 'server-org', isHosted: false };
    assert.equal(resolveOrganizationUrl({}, onPremHost), '');

    const unsafeLocation = { origin: 'https://dev.azure.com', pathname: '/_apps/hub' };
    assert.equal(resolveOrganizationUrl({}, {}, unsafeLocation), '');

    const hostUriTrimming = { host: { uri: ' https://trimme.dev.azure.com/org/ ' } };
    assert.equal(resolveOrganizationUrl(hostUriTrimming, {}), 'https://trimme.dev.azure.com/org');

    const suspiciousUri = { account: { uri: ' javascript:alert(1)//', name: 'contoso' } };
    assert.equal(resolveOrganizationUrl(suspiciousUri, {}), 'https://dev.azure.com/contoso');
}

function testTimeAgo() {
    const now = Date.now();
    const originalNow = Date.now;
    try {
        Date.now = () => now;
        const twoMinutesAgo = new Date(now - 2 * 60 * 1000).toISOString();
        const fiveSecondsAgo = new Date(now - 5 * 1000).toISOString();
        assert.equal(timeAgo(twoMinutesAgo), '2 minutes ago');
        assert.equal(timeAgo(fiveSecondsAgo), '5 seconds ago');
        const futureDate = new Date(now + 60 * 1000).toISOString();
        assert.equal(timeAgo(futureDate), '0 seconds ago');
        assert.equal(timeAgo('not-a-date'), 'unknown');
    } finally {
        Date.now = originalNow;
    }
}

function runSecurityEdgeCaseTests() {
    const maliciousLocation = {
        origin: 'https://dev.azure.com',
        pathname: '/<img%20src=x%20onerror=alert(1)>'
    };
    assert.equal(resolveOrganizationUrl({}, {}, maliciousLocation), 'https://dev.azure.com/%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');

    const unsafeOrigin = { origin: 'javascript:alert(1)', pathname: '/contoso' };
    assert.equal(resolveOrganizationUrl({}, {}, unsafeOrigin), '');
}

function run() {
    testTrimTrailingSlash();
    testClassifyActiveDuration();
    testFormatBadgeDuration();
    testFormatDuration();
    testResolveOrganizationUrl();
    testTimeAgo();
    runSecurityEdgeCaseTests();
    console.log('All helper tests passed');
}

run();
