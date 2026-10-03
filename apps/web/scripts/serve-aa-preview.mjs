import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(webRoot, "../../output/aa-simplification");
const port = Number(process.env.AA_PREVIEW_PORT || 4174);
const files = new Map([["/", ["index.html", "text/html"]], ["/app.js", ["app.js", "text/javascript"]], ["/app.css", ["app.css", "text/css"]], ["/brand/v2_1/friemi-icon-transparent-512.png", ["friemi-icon.png", "image/png"]]]);
createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const file = files.get(pathname);
  if (!file) { response.writeHead(404); response.end(); return; }
  try {
    const content = await readFile(resolve(output, file[0]));
    response.writeHead(200, { "Content-Type": `${file[1]}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(content);
  } catch { response.writeHead(404); response.end(); }
}).listen(port, "127.0.0.1", () => console.log(`Friemi AA audit preview: http://127.0.0.1:${port}/`));
