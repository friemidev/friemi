import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(webRoot, "../../output/playwright/uno-preview");
await mkdir(output, { recursive: true });
await build({
  entryPoints: [resolve(webRoot, "scripts/uno-preview-entry.tsx")], outfile: resolve(output, "app.js"),
  bundle: true, format: "esm", platform: "browser", target: "es2022", jsx: "automatic", jsxImportSource: "react",
  minify: true, loader: { ".module.css": "local-css" }, define: { "process.env.NODE_ENV": '"production"' },
});
await writeFile(resolve(output, "index.html"), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#dcecf9"><link rel="icon" href="data:,"><title>Friemi UNO · Card Club</title><link rel="stylesheet" href="/app.css"><style>
@font-face{font-family:"Friemi Latin";src:url("/font/Plus_Jakarta_Sans/PlusJakartaSans-FriemiLatin.woff2") format("woff2");font-weight:200 800;font-display:swap}
@font-face{font-family:"Friemi CJK";src:url("/font/HarmonyOS_Sans_SC/HarmonyOS_Sans_SC_FriemiUI-Regular.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Friemi CJK";src:url("/font/HarmonyOS_Sans_SC/HarmonyOS_Sans_SC_FriemiUI-Bold.woff2") format("woff2");font-weight:600 900;font-display:swap}
:root{--friemi-font-latin:"Friemi Latin",system-ui,sans-serif;--font-sans:"Friemi Latin","Friemi CJK",system-ui,sans-serif}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#dcecf9;color:#30425c;font-family:var(--font-sans)}body{padding:8px 20px 30px}button,input,select{font:inherit}button{touch-action:manipulation}button:focus-visible{outline:3px solid #3c73b0;outline-offset:4px}h1,h2,h3,p{margin:0}dialog{font-family:var(--font-sans)}@media(max-width:600px){body{padding:0 0 20px}}
</style></head><body><div id="uno-preview-root"></div><script type="module" src="/app.js"></script></body></html>`);
console.log(`Friemi UNO preview built at ${output}`);
