import { sha1 } from "./utils.js";

export function makeStableId(source: string, url: string) {
  return `${source}_${sha1(url).slice(0, 16)}`;
}
