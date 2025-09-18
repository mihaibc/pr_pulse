export const DAY_MS = 24 * 60 * 60 * 1000;
export const WARNING_THRESHOLD_MS = 2 * DAY_MS;
export const DANGER_THRESHOLD_MS = 5 * DAY_MS;

export function timeAgo(dateValue) {
    if (!dateValue) {
        return "unknown";
    }

    const target = new Date(dateValue);
    if (Number.isNaN(target.getTime())) {
        return "unknown";
    }

    const seconds = Math.floor((Date.now() - target.getTime()) / 1000);
    const lookup = [
        { label: "year", secs: 31536000 },
        { label: "month", secs: 2592000 },
        { label: "day", secs: 86400 },
        { label: "hour", secs: 3600 },
        { label: "minute", secs: 60 }
    ];

    for (const unit of lookup) {
        const interval = Math.floor(seconds / unit.secs);
        if (interval >= 1) {
            return `${interval} ${unit.label}${interval > 1 ? "s" : ""} ago`;
        }
    }

    return `${Math.max(seconds, 0)} seconds ago`;
}

export function formatDateTime(dateValue) {
    if (!dateValue) {
        return "Unknown";
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
}

export function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
        return "moments";
    }

    const totalSeconds = Math.floor(ms / 1000);
    const units = [
        { label: "day", seconds: 86400 },
        { label: "hour", seconds: 3600 },
        { label: "minute", seconds: 60 }
    ];

    const parts = [];
    let remaining = totalSeconds;

    for (const { label, seconds } of units) {
        if (remaining >= seconds) {
            const value = Math.floor(remaining / seconds);
            remaining -= value * seconds;
            parts.push(`${value} ${label}${value > 1 ? "s" : ""}`);
        }

        if (parts.length === 2) {
            break;
        }
    }

    if (parts.length === 0) {
        return `${Math.max(remaining, 0)} seconds`;
    }

    return parts.join(", ");
}

export function formatBadgeDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
        return "<1m";
    }

    const minutes = Math.floor(ms / (60 * 1000));
    if (minutes < 1) {
        return "<1m";
    }
    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d`;
}

export function classifyActiveDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0) {
        return {
            level: "info",
            description: "Active duration unavailable."
        };
    }

    if (ms >= DANGER_THRESHOLD_MS) {
        return {
            level: "danger",
            description: "Active for more than five days – needs attention."
        };
    }

    if (ms >= WARNING_THRESHOLD_MS) {
        return {
            level: "warning",
            description: "Active for more than two days – follow up soon."
        };
    }

    return {
        level: "info",
        description: "Active for less than two days."
    };
}

export function trimTrailingSlash(value) {
    if (typeof value !== "string") {
        return "";
    }
    const trimmed = value.trim();
    return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch (error) {
        return false;
    }
}

export function resolveOrganizationUrl(webContext, hostContext, locationLike) {
    const candidates = [
        webContext && webContext.account && webContext.account.uri,
        webContext && webContext.collection && webContext.collection.uri,
        webContext && webContext.host && webContext.host.uri,
        hostContext && hostContext.uri
    ];

    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            const trimmed = trimTrailingSlash(candidate.trim());
            if (isHttpUrl(trimmed)) {
                return trimmed;
            }
        }
    }

    const accountName = (webContext && webContext.account && webContext.account.name) || (hostContext && hostContext.name);

    if (accountName) {
        const encoded = encodeURIComponent(accountName);
        if (!hostContext || hostContext.isHosted !== false) {
            return `https://dev.azure.com/${encoded}`;
        }
    }

    const location = locationLike || (typeof window !== "undefined" ? window.location : undefined);
    if (location && location.origin && location.pathname) {
        if (!isHttpUrl(location.origin)) {
            return "";
        }

        const segments = location.pathname.split("/").filter(Boolean);
        if (segments.length > 0 && !segments[0].startsWith("_")) {
            let segment = segments[0];
            try {
                segment = decodeURIComponent(segment);
            } catch (error) {
                // keep original when decoding fails
            }
            return `${trimTrailingSlash(location.origin)}/${encodeURIComponent(segment)}`;
        }
    }

    return "";
}
