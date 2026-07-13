/**
 * Build + package the frontend for cPanel.
 *
 * Why this exists: the cPanel host cannot BUILD a Next.js app (processes are
 * capped at 4 GB and the build OOMs), but it can happily RUN a finished build.
 * So we build here, on a machine with real memory, and ship the result.
 *
 * What it does:
 *   1. Sets BACKEND_URL (rewrites are baked into the build, not read at runtime).
 *   2. Runs `next build` with output: "standalone".
 *   3. Assembles the bundle — Next does NOT copy these two itself:
 *        .next/static  ->  .next/standalone/.next/static
 *        public        ->  .next/standalone/public
 *   4. Archives it to cpanel-frontend.tar.gz for upload to cPanel.
 *
 * IMPORTANT — we use `tar`, NOT PowerShell's Compress-Archive.
 * Compress-Archive silently produces a CORRUPT archive for node_modules: it
 * writes the directory entries but drops the files inside them, so the app dies
 * on the server with "Cannot find module 'next/dist/server/next.js'". `tar` is
 * built into Windows 10+ (bsdtar) and handles the deep tree correctly.
 * cPanel's File Manager can Extract .tar.gz natively.
 *
 * Usage:
 *   npm run build:cpanel     # build + package
 *   npm run package:cpanel   # package only (skips the build — much faster)
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const standalone = join(root, ".next", "standalone");
const archivePath = join(root, "cpanel-frontend.tar.gz");

const skipBuild = process.argv.includes("--no-build");

// The live Django API. Override by setting BACKEND_URL before running.
const BACKEND_URL = process.env.BACKEND_URL ?? "https://api.smcacademy.org";

const step = (msg) => console.log(`\n\x1b[36m▸ ${msg}\x1b[0m`);
const die = (msg) => {
  console.error(`\n\x1b[31m✖ ${msg}\x1b[0m\n`);
  process.exit(1);
};

// ── 1. Build ────────────────────────────────────────────────────────────────
if (skipBuild) {
  step("Skipping build (--no-build) — packaging the existing .next/standalone");
} else {
  step(`Building with BACKEND_URL=${BACKEND_URL}`);
  const build = spawnSync("npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, BACKEND_URL, NODE_ENV: "production" },
  });
  if (build.status !== 0) die("next build failed — fix the errors above and re-run.");
}

if (!existsSync(standalone)) {
  die('No .next/standalone found. Is output: "standalone" still set in next.config.ts?');
}

// ── 2. Assemble (Next leaves these out of the standalone folder) ────────────
step("Assembling the bundle (static assets + public/)");
cpSync(join(root, ".next", "static"), join(standalone, ".next", "static"), { recursive: true });
if (existsSync(join(root, "public"))) {
  cpSync(join(root, "public"), join(standalone, "public"), { recursive: true });
}

// Sanity check: static assets must exist, or the site renders unstyled.
if (!existsSync(join(standalone, ".next", "static"))) {
  die(".next/static is missing from the bundle — delete .next/ and rebuild.");
}

// ── 3. Archive with tar (NOT Compress-Archive — see header) ─────────────────
//
// node_modules is EXCLUDED on purpose. CloudLinux/cPanel requires node_modules
// in the app root to be a SYMLINK into its own Node virtualenv:
//   "NodeJS Selector demands to store node modules ... in separate folder
//    (virtual environment) pointed by symlink called 'node_modules'."
// Shipping a real node_modules folder breaks "Run NPM Install" outright. So we
// ship only the app, and let cPanel install the packages via Run NPM Install.
step("Archiving → cpanel-frontend.tar.gz (excluding node_modules)");
if (existsSync(archivePath)) rmSync(archivePath);

const tar = spawnSync(
  "tar",
  ["--exclude=./node_modules", "-czf", archivePath, "-C", standalone, "."],
  { stdio: "inherit", shell: true },
);

if (tar.status !== 0 || !existsSync(archivePath)) {
  die(
    "tar failed or is unavailable.\n" +
      "  Windows 10+ ships with tar. If yours doesn't, install 7-Zip and archive\n" +
      `  the CONTENTS of:  ${standalone}\n` +
      "  Do NOT use right-click > Send to > Compressed folder — it corrupts node_modules.",
  );
}

const mb = (statSync(archivePath).size / 1024 / 1024).toFixed(1);
console.log(`
\x1b[32m✔ Done.\x1b[0m  cpanel-frontend.tar.gz  (${mb} MB)

Deploy to cPanel (File Manager -> /home/smca/staging.smcacademy.org):
  1. DELETE the existing .next and public folders.
  2. Upload cpanel-frontend.tar.gz, then Extract it there.
  3. Node.js app -> RESTART.
Do NOT delete the node_modules symlink, and do NOT re-run NPM Install unless
package.json changed.
`);
