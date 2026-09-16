#!/usr/bin/env node
/**
 * Builds the MCPB bundle (one-click install for Claude Desktop; the artifact Smithery
 * distributes for local servers).
 *
 * Layout inside the bundle, per the MCPB spec:
 *   manifest.json   version synced from package.json so the two cannot drift
 *   dist/           the compiled server
 *   node_modules/   production dependencies only, installed from the lock file
 *   package.json    so `node` resolves the dependency graph
 *
 * Run `npm run build` first. Output: currentdt-mcp.mcpb in the repo root.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stage = path.join(root, 'mcpb-build');
const out = path.join(root, 'currentdt-mcp.mcpb');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

if (!fs.existsSync(path.join(root, 'dist', 'index.js'))) {
  console.error('dist/index.js not found -- run `npm run build` first');
  process.exit(1);
}

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage);

// manifest.json with the package version. The checked-in manifest keeps a version
// too, but this copy is the one that ships; package.json is the single source.
manifest.version = pkg.version;
fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

fs.cpSync(path.join(root, 'dist'), path.join(stage, 'dist'), { recursive: true });
for (const f of ['package.json', 'package-lock.json', 'LICENSE', 'README.md']) {
  fs.copyFileSync(path.join(root, f), path.join(stage, f));
}

// Production dependencies from the lock file: reproducible, and no dev tooling
// in the bundle. Lifecycle scripts are skipped -- nothing here needs them and it
// keeps the bundle build from executing arbitrary install hooks.
execSync('npm ci --omit=dev --ignore-scripts --no-audit --no-fund', { cwd: stage, stdio: 'inherit' });

// Prove the staged server actually starts from inside the bundle layout before
// packing it: a bundle that ships and fails to launch is the failure mode that
// went unnoticed for a year in the npm package.
const probe = execSync(`node "${path.join(stage, 'dist', 'index.js')}" --version`, { encoding: 'utf8' }).trim();
if (!probe.includes(pkg.version)) {
  console.error(`staged server reported "${probe}", expected version ${pkg.version}`);
  process.exit(1);
}

fs.rmSync(out, { force: true });
execSync(`npx -y @anthropic-ai/mcpb pack "${stage}" "${out}"`, { stdio: 'inherit' });

const size = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`\nbundle: ${out} (${size} kB)`);
