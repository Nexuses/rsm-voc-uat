import fs from "node:fs";
import path from "node:path";

const [,, src, dest] = process.argv;
if (!src || !dest) {
  console.error("usage: save-cdp-shot.mjs <cdp-json> <out.png>");
  process.exit(1);
}
const j = JSON.parse(fs.readFileSync(src, "utf8"));
const data = j.data ?? j.result?.data ?? j.response?.data;
if (!data) {
  console.error("no data in", Object.keys(j));
  process.exit(1);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, Buffer.from(data, "base64"));
console.log(dest, Buffer.from(data, "base64").length);
