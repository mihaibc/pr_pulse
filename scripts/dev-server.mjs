import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { createReadStream } = fs;
const fsPromises = fs.promises;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const defaultCertDir = path.join(rootDir, "dev-certs");
const certPath = process.env.DEV_CERT_PATH || path.join(defaultCertDir, "localhost-cert.pem");
const keyPath = process.env.DEV_KEY_PATH || path.join(defaultCertDir, "localhost-key.pem");

let certificate;
let key;

try {
    certificate = fs.readFileSync(certPath);
    key = fs.readFileSync(keyPath);
} catch (error) {
    console.error("\nUnable to read development certificate.");
    console.error(`Expected to find cert at ${certPath}`);
    console.error(`Expected to find key at ${keyPath}`);
    console.error("\nGenerate one with a trusted tool (e.g., mkcert) or point DEV_CERT_PATH/DEV_KEY_PATH to existing files.");
    console.error("Example using mkcert:\n  mkdir -p dev-certs\n  mkcert -install\n  mkcert -key-file dev-certs/localhost-key.pem -cert-file dev-certs/localhost-cert.pem 127.0.0.1 localhost");
    process.exit(1);
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

const server = https.createServer({ key, cert: certificate }, async (request, response) => {
    try {
        const url = new URL(request.url || "", `https://${request.headers.host}`);
        let relativePath = decodeURIComponent(url.pathname);
        if (relativePath.startsWith("/")) {
            relativePath = relativePath.slice(1);
        }
        if (!relativePath || relativePath.endsWith("/")) {
            relativePath = path.join(relativePath, "index.html");
        }

        const requestedPath = path.normalize(path.join(rootDir, relativePath));
        if (!requestedPath.startsWith(rootDir)) {
            response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Forbidden");
            return;
        }

        const stats = await fsPromises.stat(requestedPath);
        const filePath = stats.isDirectory() ? path.join(requestedPath, "index.html") : requestedPath;

        const extension = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[extension] || "application/octet-stream";

        response.writeHead(200, {
            "Content-Type": contentType,
            "Cache-Control": "no-store"
        });

        createReadStream(filePath).pipe(response);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.error(error);
        }
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
    }
});

server.listen(port, host, () => {
    console.log(`Secure dev server running on https://${host}:${port}`);
    console.log("Update vss-extension.dev.json baseUri to match this origin.");
    console.log("Press Ctrl+C to stop.");
});

process.on("SIGINT", () => {
    console.log("\nShutting down dev server...");
    server.close(() => process.exit(0));
});
