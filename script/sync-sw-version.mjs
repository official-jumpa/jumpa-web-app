import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const pkgPath = path.join(rootDir, "package.json");
const swPath = path.join(rootDir, "public", "sw.js");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = `v${pkg.version}`;

let swContent = fs.readFileSync(swPath, "utf8");
const updatedSwContent = swContent.replace(
  /const VERSION = "[^"]*";/,
  `const VERSION = "${version}";`,
);

if (swContent !== updatedSwContent) {
  fs.writeFileSync(swPath, updatedSwContent, "utf8");
  console.log(`[PWA] Synchronized public/sw.js VERSION to ${version}`);
} else {
  console.log(`[PWA] public/sw.js VERSION is already up to date (${version})`);
}
