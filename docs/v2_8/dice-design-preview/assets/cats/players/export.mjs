#!/usr/bin/env node
/** Export the original Friemi React cat artwork. No paths or palettes are redrawn. */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const output = path.dirname(fileURLToPath(import.meta.url));
let repository = output;
while (!existsSync(path.join(repository, 'apps/web/features/game-tools/components/DrawGuessCatSprite.tsx'))) {
  const parent = path.dirname(repository);
  if (parent === repository) throw new Error('Complete Friemi repository not found above this exporter.');
  repository = parent;
}
const web = path.join(repository, 'apps/web');
const requireWeb = createRequire(path.join(web, 'package.json'));
const { build } = requireWeb('esbuild');
const sharp = requireWeb('sharp');
const bundle = path.join(output, '.cat-render-runtime.cjs');
const sourcePaths = {
  sprite: 'apps/web/features/game-tools/components/DrawGuessCatSprite.tsx',
  definitions: 'apps/web/features/game-tools/drawGuessCats.ts',
  picker: 'apps/web/features/game-tools/components/DrawGuessLobby.tsx',
};
const stateProps = {
  idle: { mood: 'idle', activity: 'none', frame: 0 },
  thinking: { mood: 'idle', activity: 'thinking', frame: 8 },
  happy: { mood: 'happy', activity: 'none', frame: 5 },
  sad: { mood: 'sad', activity: 'none', frame: 5 },
};
const titles = { idle: '等待', thinking: '思考', happy: '开心', sad: '失落' };
const players = [
  { id: 'cloud', previewPlayer: '我', traits: '奶油白、毛簇、蓬尾' },
  { id: 'baker', previewPlayer: '桃桃', traits: '珊瑚粉贝雷帽与围裙、折耳、面包' },
  { id: 'scholar', previewPlayer: '小鹿', traits: '绿色衣服、蓝帽、方眼镜、书' },
  { id: 'captain', previewPlayer: '猫猫', traits: '青蓝制服、皇冠、高耳、蓬尾' },
];
const viewBox = '-8 -18 136 136';
try {
  await build({
    stdin: {
      contents: `import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DrawGuessCatSprite } from '@/features/game-tools/components/DrawGuessCatSprite';
import { DRAW_GUESS_CATS } from '@/features/game-tools/drawGuessCats';
export { DRAW_GUESS_CATS };
export function renderCat(props, prefix) {
  return renderToStaticMarkup(React.createElement(DrawGuessCatSprite, props), { identifierPrefix: prefix });
}`,
      resolveDir: web,
      loader: 'tsx',
      sourcefile: 'dice-player-cats-export.tsx',
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    jsx: 'automatic',
    tsconfig: path.join(web, 'tsconfig.json'),
    outfile: bundle,
    logLevel: 'silent',
  });
  const runtime = createRequire(import.meta.url)(bundle);
  const manifest = {
    schemaVersion: 1,
    source: sourcePaths,
    sourceSha256: {},
    artwork: 'Direct React server-rendered DrawGuessCatSprite; unchanged source vector paths, gradients and colors',
    direction: 'S',
    detail: 'full',
    sourceSizeProp: 120,
    sourceViewBox: '0 0 120 116',
    exportViewBox: viewBox,
    exportDimensions: { width: 136, height: 136 },
    pngDimensions: { width: 256, height: 256 },
    groundAnchor: { x: 68 / 136, y: 126 / 136 },
    states: stateProps,
    animated: false,
    characters: [],
  };
  for (const [key, relative] of Object.entries(sourcePaths)) {
    const source = await fs.readFile(path.join(repository, relative));
    manifest.sourceSha256[key] = createHash('sha256').update(source).digest('hex');
  }
  const validation = { exactSourceComponents: true, characters: 4, statesPerCharacter: 4, svgCount: 0, pngCount: 0, emptyPngBorders: true, completeSvgReferences: true, uniqueGradientPrefixes: true };
  const allIds = new Set();
  for (const player of players) {
    const definition = runtime.DRAW_GUESS_CATS.find((cat) => cat.id === player.id);
    if (!definition) throw new Error(`Missing original character ${player.id}`);
    const entry = { ...player, name: { 'zh-CN': definition.zh, en: definition.en, fr: definition.fr }, originalPalette: { fur: definition.fur, patch: definition.patch, outfit: definition.outfit }, files: {} };
    for (const [state, props] of Object.entries(stateProps)) {
      const prefix = `dice-player-${player.id}-${state}-`;
      const markup = runtime.renderCat({ ...props, animated: false, catId: player.id, direction: 'S', size: 120 }, prefix);
      const sourceSvg = markup.match(/<svg[\s\S]*<\/svg>/)?.[0];
      if (!sourceSvg) throw new Error(`No SVG emitted for ${player.id}/${state}`);
      const titleId = `${prefix}title`;
      const body = sourceSvg.slice(sourceSvg.indexOf('>') + 1, sourceSvg.lastIndexOf('</svg>'));
      // A shared padded root viewport prevents the original jump/crown/bubble
      // from clipping when the SVG is used as an external <img>. Inner artwork
      // and pose transforms are untouched.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="136" height="136" fill="none" role="img" aria-labelledby="${titleId}"><title id="${titleId}">${definition.zh} · ${titles[state]}</title>${body}</svg>\n`;
      const localIds = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
      for (const match of svg.matchAll(/url\(#([^)]+)\)/g)) if (!localIds.has(match[1])) throw new Error(`Missing SVG reference ${match[1]}`);
      for (const id of localIds) {
        if (allIds.has(id)) throw new Error(`Duplicate SVG id ${id}`);
        allIds.add(id);
      }
      const stem = `${player.id}-${state}`;
      await fs.writeFile(path.join(output, `${stem}.svg`), svg);
      const image = await sharp(Buffer.from(svg), { density: 192 }).resize(256, 256).png().toBuffer();
      await fs.writeFile(path.join(output, `${stem}.png`), image);
      const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (x && y && x !== info.width - 1 && y !== info.height - 1) continue;
        if (data[(y * info.width + x) * info.channels + 3] !== 0) throw new Error(`Clipped asset edge: ${stem}`);
      }
      entry.files[state] = { svg: `${stem}.svg`, png: `${stem}.png`, sourceProps: { ...props, catId: player.id, direction: 'S', size: 120, animated: false } };
      validation.svgCount++; validation.pngCount++;
    }
    manifest.characters.push(entry);
  }
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(output, 'validation.json'), JSON.stringify(validation, null, 2) + '\n');
  // Small source-artwork contact sheet; no browser/app screenshot is claimed.
  const cellWidth = 220, cellHeight = 208;
  const labels = ['idle', 'thinking', 'happy', 'sad'];
  const layers = [];
  for (let column = 0; column < players.length; column++) for (let row = 0; row < labels.length; row++) {
    const buffer = await sharp(path.join(output, `${players[column].id}-${labels[row]}.png`)).resize(164,164).toBuffer();
    layers.push({ input: buffer, left: column * cellWidth + 28, top: row * cellHeight + 30 });
    const label = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="24"><text x="12" y="18" font-family="sans-serif" font-size="13" fill="#30425C">${players[column].id} / ${labels[row]}</text></svg>`;
    layers.push({ input: Buffer.from(label), left: column * cellWidth, top: row * cellHeight + 3 });
  }
  await sharp({ create: { width: cellWidth * players.length, height: cellHeight * labels.length, channels: 4, background: '#DCECF9' } }).composite(layers).png().toFile(path.join(output, 'contact-sheet.png'));
  console.log(`Exported ${validation.svgCount} original-character SVGs and ${validation.pngCount} PNG previews; all borders and SVG references verified.`);
} finally {
  await fs.rm(bundle, { force: true });
}
