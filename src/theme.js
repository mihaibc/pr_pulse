import { trimTrailingSlash } from "../helpers.js";

const THEME_CLASS_LIGHT = "pr-theme-light";
const THEME_CLASS_DARK = "pr-theme-dark";
const THEME_CLASS_HIGH_CONTRAST = "pr-theme-high-contrast";

let themeHandlingInitialized = false;
let cachedThemeName = "";
let customThemeStyleElement;

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

export function applyThemeClass(themeData) {
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

export function getCachedThemeName() {
    return cachedThemeName;
}

export function setupThemeHandling() {
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

export async function fetchUserTheme(accountUri, accessToken) {
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
