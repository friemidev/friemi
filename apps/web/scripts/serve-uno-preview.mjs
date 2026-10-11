import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(webRoot, "../../output/playwright/uno-preview");
const publicRoot = resolve(webRoot, "public");
const port = Number(process.env.UNO_PREVIEW_PORT || 4178);
const assets = new Map([["/app.js", [resolve(output, "app.js"), "text/javascript"]], ["/app.css", [resolve(output, "app.css"), "text/css"]]]);
createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname); }
  catch { response.writeHead(400); response.end(); return; }
  let file = assets.get(pathname);
  if (pathname.startsWith("/font/") || pathname.startsWith("/game-tools/uno/")) {
    const asset = resolve(publicRoot, `.${pathname}`);
    if (!asset.startsWith(publicRoot + sep)) { response.writeHead(403); response.end(); return; }
    file = [asset, pathname.endsWith(".woff2") ? "font/woff2" : pathname.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream"];
  }
  if (!file && (pathname === "/" || /^\/(zh-CN|en|fr)\/game-tools(?:\/uno(?:\/.*)?)?\/?$/.test(pathname))) file = [resolve(output, "index.html"), "text/html"];
  if (!file) { response.writeHead(404); response.end(); return; }
  try {
    const content = await readFile(file[0]);
    response.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); response.end(content);
  } catch { response.writeHead(404); response.end(); }
}).listen(port, "127.0.0.1", () => console.log(`Friemi UNO preview: http://127.0.0.1:${port}/?scene=table`));
