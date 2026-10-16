import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { DrawGuessCatSprite } from "../features/game-tools/components/DrawGuessCatSprite";

// Reuse Friemi's actual pets rather than drawing a second character family.
function cat(
  catId: "cloud" | "mango" | "peach",
  direction: "S" | "SE" | "SW",
  x: number,
  y: number,
  size: number,
) {
  const markup = renderToStaticMarkup(
    <DrawGuessCatSprite
      catId={catId}
      direction={direction}
      size={96}
      animated={false}
      frame={0}
    />,
    { identifierPrefix: `ddz-logo-${catId}-` },
  );
  const svg = markup.slice(markup.indexOf("<svg"));
  const content = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  return `<g transform="translate(${x} ${y}) scale(${size / 120})">${content}</g>`;
}

const ink = "#30425c",
  paper = "#fffcf5",
  sky = "#3c73b0";
const heart = `<path d="M0-3C-7-10-13 0 0 8C13 0 7-10 0-3Z" fill="#bb4b4e"/>`;
const spade = `<path d="M0-9C-3-4-12 0-7 6C-4 9-1 6 0 4C1 6 4 9 7 6C12 0 3-4 0-9ZM-1 5L-4 11H4L1 5Z" fill="${ink}"/>`;
function fan(x: number, y: number, rotation: number) {
  return `<g transform="translate(${x} ${y}) rotate(${rotation})" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round">
    ${[-1, 0, 1].map((i) => `<g transform="rotate(${i * 17} 0 27)"><rect x="${-10 + i * 8}" y="-11" width="22" height="34" rx="4" fill="${paper}"/><g transform="translate(${1 + i * 8} 3) scale(.43)" stroke="none">${i === 0 ? heart : spade}</g></g>`).join("")}
  </g>`;
}

const scene = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" fill="none">
  <title>Three Friemi cats playing cards</title>
  <ellipse cx="180" cy="130" rx="138" ry="116" fill="${paper}"/>
  <ellipse cx="182" cy="235" rx="139" ry="12" fill="${ink}" opacity=".08"/>
  <path d="M114 193L104 228M248 193L258 228" stroke="${ink}" stroke-width="10" stroke-linecap="round"/>
  <path d="M114 193L106 225M248 193L256 225" stroke="#99b6cf" stroke-width="5" stroke-linecap="round"/>
  ${cat("cloud", "S", 121, 7, 118)}
  <ellipse cx="180" cy="177" rx="115" ry="48" fill="${sky}" stroke="${ink}" stroke-width="3"/>
  <ellipse cx="180" cy="168" rx="115" ry="46" fill="#dcecf9" stroke="${ink}" stroke-width="3"/>
  <ellipse cx="180" cy="168" rx="102" ry="36" stroke="${sky}" stroke-opacity=".3" stroke-width="1.5"/>
  ${cat("mango", "SE", 5, 104, 134)}
  ${cat("peach", "SW", 220, 104, 134)}
  ${fan(179, 104, 0)}
  ${fan(104, 180, 17)}
  ${fan(250, 180, -17)}
  <g transform="translate(157 145) rotate(-12 14 20)"><rect width="27" height="38" rx="4" fill="${paper}" stroke="${ink}" stroke-width="1.7"/><g transform="translate(13.5 17) scale(.65)">${spade}</g></g>
  <g transform="translate(183 151) rotate(10 14 20)"><rect width="27" height="38" rx="4" fill="${paper}" stroke="${ink}" stroke-width="1.7"/><g transform="translate(13.5 18) scale(.7)">${heart}</g></g>
</svg>\n`;

const target = resolve("public/game-tools/doudizhu/logo.svg");
await writeFile(target, scene);
console.log("Generated the three-cat Dou Dizhu logo.");
