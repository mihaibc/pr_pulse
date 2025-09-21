export async function fetchJson(url, accessToken, options = {}) {
    const { context } = options;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-VSS-ForceMsaPassThrough": "true"
        }
    });

    if (!response.ok) {
        const message = await response.text();
        const error = new Error(
            `${response.status} ${response.statusText}${message ? ` - ${message}` : ""}${context ? ` (${context})` : ""}`
        );
        error.status = response.status;
        error.statusText = response.statusText;
        error.body = message;
        error.url = url;
        error.context = context;
        throw error;
    }

    return response.json();
}
