import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(webRoot, "../../output/aa-simplification");
await mkdir(output, { recursive: true });
await build({
  entryPoints: [resolve(webRoot, "scripts/aa-preview-entry.tsx")],
  outfile: resolve(output, "app.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "react",
  minify: true,
  loader: { ".module.css": "local-css" },
  alias: { "next/navigation": resolve(webRoot, "scripts/aa-preview-next-shim.ts") },
});
await copyFile(resolve(webRoot, "public/brand/v2_1/friemi-icon-transparent-512.png"), resolve(output, "friemi-icon.png"));
await writeFile(resolve(output, "index.html"), `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f0f2eb"><link rel="icon" href="data:,"><title>Friemi AA · 本地审计预览</title><link rel="stylesheet" href="/app.css"><style>html,body{margin:0;min-height:100%;background:#f0f2eb;font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}button,select{font:inherit}button{cursor:pointer}aside label{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}aside select{max-width:118px;min-height:35px;border:1px solid #dce4d6;border-radius:9px;padding:5px 8px;background:white;color:#376046;font-size:12px}aside button{margin-left:auto;border:0;background:transparent;color:#376046;font-size:12px;text-decoration:underline}</style></head><body><div id="aa-preview-root"></div><script type="module" src="/app.js"></script></body></html>`);
console.log(`AA audit preview built at ${output}`);
