#!/usr/bin/env node
/**
 * Publishes the MCPB bundle to Smithery through its documented API.
 *
 *   PUT https://api.smithery.ai/servers/{namespace}%2F{server}/releases
 *   multipart: payload (JSON StdioDeployPayload) + bundle (the .mcpb file)
 *
 * Why not `smithery mcp publish`? It builds the server card from manifest.tools
 * verbatim, and Smithery's card requires each tool's inputSchema -- which the MCPB
 * manifest schema forbids. A spec-valid bundle therefore cannot be published by the
 * CLI. This script sends the server card that scripts/build-mcpb.js derived from the
 * running server, alongside an unmodified, spec-valid bundle.
 *
 * Usage:
 *   SMITHERY_API_KEY=... node scripts/publish-smithery.js [namespace/server]
 *   (key from https://smithery.ai/account/api-keys; default target is biswajitmailid/currentdt-mcp)
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api.smithery.ai';
const root = path.resolve(__dirname, '..');
const bundlePath = path.join(root, 'currentdt-mcp.mcpb');
const cardPath = path.join(root, 'server-card.json');
const target = process.argv[2] || 'biswajitmailid/currentdt-mcp';

const apiKey = process.env.SMITHERY_API_KEY;
if (!apiKey) {
  console.error('SMITHERY_API_KEY is not set. Create one at https://smithery.ai/account/api-keys.');
  process.exit(2);
}
for (const f of [bundlePath, cardPath]) {
  if (!fs.existsSync(f)) {
    console.error(`${path.basename(f)} not found -- run \`npm run build:mcpb\` first`);
    process.exit(2);
  }
}

const serverCard = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
const payload = { type: 'stdio', runtime: 'node', serverCard };

const form = new FormData();
form.append('payload', JSON.stringify(payload));
form.append('bundle', new Blob([fs.readFileSync(bundlePath)], { type: 'application/zip' }), 'server.mcpb');

const qualified = encodeURIComponent(target); // namespace%2Fserver, as the API requires
const headers = { Authorization: `Bearer ${apiKey}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // A release can only be attached to an existing server record. This call is
  // idempotent -- it succeeds if the server already exists and the caller owns it.
  const created = await fetch(`${API}/servers/${qualified}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: serverCard.serverInfo.title, description: serverCard.serverInfo.description }),
  });
  if (!created.ok) {
    console.error(`Could not create/confirm server ${target}: ${created.status} ${await created.text()}`);
    process.exit(1);
  }
  console.log(`Server ${target} ${created.status === 201 ? 'created' : 'confirmed'}.`);

  console.log(`Publishing ${target} ${serverCard.serverInfo.version} (stdio, ${(fs.statSync(bundlePath).size / 1024).toFixed(0)} kB)...`);
  const res = await fetch(`${API}/servers/${qualified}/releases`, { method: 'PUT', headers, body: form });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Release rejected: ${res.status} ${text}`);
    process.exit(1);
  }
  const { deploymentId, status, warnings } = JSON.parse(text);
  console.log(`Release accepted: ${deploymentId} (${status})`);
  for (const w of warnings || []) console.log(`  warning: ${w}`);

  // Poll until the pipeline settles. Stages: deploy, scan, metadata, publish.
  const terminal = new Set(['SUCCESS', 'FAILURE', 'FAILURE_SCAN', 'AUTH_REQUIRED', 'CANCELLED', 'INTERNAL_ERROR']);
  let last = '';
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const r = await fetch(`${API}/servers/${qualified}/releases/${deploymentId}`, { headers });
    if (!r.ok) {
      console.error(`Status check failed: ${r.status} ${await r.text()}`);
      process.exit(1);
    }
    const info = await r.json();
    const line = `${info.status}` + (info.logs?.length ? ` -- ${info.logs[info.logs.length - 1].message}` : '');
    if (line !== last) console.log(`  ${line}`);
    last = line;
    if (terminal.has(info.status)) {
      if (info.status !== 'SUCCESS') {
        for (const l of info.logs || []) if (l.level === 'failure' || l.error) console.error(`  [${l.stage}] ${l.message} ${l.error?.message || ''}`);
        process.exit(1);
      }
      console.log(`Published: https://smithery.ai/server/${target}`);
      return;
    }
  }
  console.error('Timed out waiting for the release pipeline.');
  process.exit(1);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
