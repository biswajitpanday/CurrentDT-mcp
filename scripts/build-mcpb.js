#!/usr/bin/env node
/**
 * Builds the MCPB bundle (one-click install for Claude Desktop; the artifact Smithery
 * distributes for local servers).
 *
 * Layout inside the bundle, per the MCPB spec:
 *   manifest.json   assembled here -- see below
 *   dist/           the compiled server
 *   node_modules/   production dependencies only, installed from the lock file
 *   package.json    so `node` resolves the dependency graph
 *
 * The shipped manifest is assembled, not copied. The checked-in manifest.json holds
 * static metadata only; version comes from package.json and the tools array comes
 * from the staged server's own tools/list, so neither can drift from what the bundle
 * actually contains. (Smithery's server card requires each tool's inputSchema.)
 *
 * Run `npm run build` first. Output: currentdt-mcp.mcpb and server-card.json in the repo root.
 */
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const stage = path.join(root, 'mcpb-build');
const out = path.join(root, 'currentdt-mcp.mcpb');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

/** Drive the staged server over real stdio JSON-RPC and return what it advertises. */
function listTools(entry) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry], { stdio: ['pipe', 'pipe', 'pipe'] });
    let buf = '';
    let stderr = '';
    let serverVersion;
    const send = (o) => child.stdin.write(JSON.stringify(o) + '\n');
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`tools/list timed out. stderr: ${stderr}`));
    }, 15000);

    child.stderr.on('data', (d) => (stderr += d));
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        const msg = JSON.parse(line);
        if (msg.id === 1) {
          serverVersion = msg.result?.serverInfo?.version;
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
        } else if (msg.id === 2) {
          clearTimeout(timer);
          child.kill();
          if (msg.error) reject(new Error(msg.error.message));
          else resolve({ serverVersion, tools: msg.result.tools });
        }
      }
    });

    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'build-mcpb', version: '0' } },
    });
  });
}

async function main() {
  if (!fs.existsSync(path.join(root, 'dist', 'index.js'))) {
    throw new Error('dist/index.js not found -- run `npm run build` first');
  }

  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage);
  fs.cpSync(path.join(root, 'dist'), path.join(stage, 'dist'), { recursive: true });
  for (const f of ['package.json', 'package-lock.json', 'LICENSE', 'README.md']) {
    fs.copyFileSync(path.join(root, f), path.join(stage, f));
  }

  // Production dependencies from the lock file: reproducible, no dev tooling in the
  // bundle. Lifecycle scripts are skipped -- nothing here needs them, and it keeps the
  // bundle build from executing arbitrary install hooks.
  execSync('npm ci --omit=dev --ignore-scripts --no-audit --no-fund', { cwd: stage, stdio: 'inherit' });

  // Launch the staged server from inside the bundle layout. A bundle that ships and
  // fails to start is the failure mode that went unnoticed for a year in the npm
  // package; this is the check that prevents it, and it doubles as the source of truth
  // for the server card.
  const { serverVersion, tools } = await listTools(path.join(stage, 'dist', 'index.js'));
  if (serverVersion !== pkg.version) {
    throw new Error(`staged server reports version ${serverVersion}, package.json says ${pkg.version}`);
  }
  console.log(`staged server ${serverVersion} advertises: ${tools.map((t) => t.name).join(', ')}`);

  manifest.version = pkg.version;
  // MCPB's manifest schema is strict: a tool is `name` + `description`, nothing else.
  manifest.tools = tools.map(({ name, description }) => ({ name, description }));
  fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

  // Smithery's server card, by contrast, REQUIRES each tool's inputSchema. The two
  // specs contradict each other, and the Smithery CLI copies manifest.tools verbatim,
  // so it cannot publish a spec-valid bundle. scripts/publish-smithery.js sends this
  // card through their API instead. It lives outside the bundle on purpose.
  const serverCard = {
    serverInfo: {
      name: manifest.name,
      version: pkg.version,
      title: manifest.display_name,
      description: manifest.description,
      websiteUrl: manifest.homepage,
    },
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
  };
  fs.writeFileSync(path.join(root, 'server-card.json'), JSON.stringify(serverCard, null, 2) + '\n');

  execSync(`npx -y @anthropic-ai/mcpb validate "${path.join(stage, 'manifest.json')}"`, { stdio: 'inherit' });

  fs.rmSync(out, { force: true });
  execSync(`npx -y @anthropic-ai/mcpb pack "${stage}" "${out}"`, { stdio: 'inherit' });

  console.log(`server card: ${path.join(root, 'server-card.json')}`);
  console.log(`\nbundle: ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} kB)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
