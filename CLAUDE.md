# CLAUDE.md

Guidance for Claude Code when working in this repository. Everything here describes the
code as it is; if a statement stops being true, fix the statement.

## What this is

`@strix-ai/currentdt-mcp` is an MCP server exposing two tools over stdio:
`get_current_datetime` (any IANA zone, structured output) and `convert_timezone`
(DST-correct). Published to npm from CI via Trusted Publishing (OIDC) -- there is no npm
token anywhere. Requires Node 18+.

Tool errors (bad format, failed provider) are thrown from the handler and become
`isError` results; the SDK validates arguments against the zod `inputSchema` and
`structuredContent` against `outputSchema` before anything reaches a client.

The v2 plan lives in `docs/v2/` (`ROADMAP.md`, `TOOL-SPEC.md`, `MIGRATION.md`). Read
`ROADMAP.md` before starting feature work; it says which phase is next and why the
ordering matters. Nothing in those docs is marked complete until it is merged.

## Commands

```bash
npm run build        # tsc -> dist/
npm test             # jest, all suites (unit + integration); must stay green in any TZ
npm run test:unit
npm run test:integration
npm run lint         # eslint "src/**/*.ts"  (keep the quotes -- bash globstar is off on CI)
npm run type-check   # tsc --noEmit
npm run dev          # tsx watch src/index.ts
node dist/index.js --test              # exercise the built package end to end
node dist/index.js --validate-format "YYYY-MM-DD"
```

Release: bump `version` in package.json (`npm version patch --no-git-tag-version`) and
push to `master`. The workflow tests on Node 18/20/22, publishes to npm if the version
is new, creates the tag and GitHub release, then publishes to the MCP Registry (OIDC,
no secret; it syncs `server.json`'s version from package.json). Do not create the
release tag by hand. `package.json` `mcpName` must equal `server.json` `name` -- the
registry reads it from the published npm tarball to prove ownership.

The workflow also builds `currentdt-mcp.mcpb` (`npm run build:mcpb`, `manifest.json`
+ `scripts/build-mcpb.js`) and attaches it to the GitHub release: one-click install for
Claude Desktop, and the artifact Smithery distributes for local servers. The build
script launches the staged server before packing, so a bundle that cannot start is
never published, and it derives the manifest's tool list and a separate
`server-card.json` from the server's own tools/list.

Smithery is published by hand per release: `SMITHERY_API_KEY=... npm run
publish:smithery` (key from `smithery auth token`). Not the Smithery CLI: it copies
`manifest.tools` into a server card that requires `inputSchema`, which the MCPB
manifest schema forbids, so it rejects every spec-valid bundle. The script sends the
generated server card through Smithery's API alongside the unmodified bundle.

## Layout

```
src/
├── index.ts                    # CLI entry; owns process lifetime and signal handling
├── server/
│   ├── MCPServer.ts            # McpServer + transport; instructions; prompts stub
│   └── tools.ts                # both tools: zod input/output schemas, annotations, handlers
├── services/
│   ├── DateTimeService.ts      # resolve(): options -> provider -> DateTimeResult
│   └── ConfigurationManager.ts # config file + CURRENTDT_* env overrides
├── providers/                  # IDateTimeProvider: LocalProvider, RemoteProvider, factory
├── utils/
│   ├── DateFormatter.ts        # tokens -> string, in any zone
│   ├── TimeZone.ts             # Intl-based zone maths: parts, offsets, DST, wall-clock -> instant
│   ├── Validator.ts            # option/format validation
│   └── Logger.ts               # JSON lines to stderr
└── types/                      # zod schemas + shared types
```

## Rules that exist because something broke

1. **stdout is JSON-RPC only.** Every log line goes to stderr (`Logger.ts`). A single
   stray `console.log` in server mode breaks every client silently.
2. **Never apply a default at two layers.** The options schema in `MCPTypes.ts` has no
   `.default()`; defaults resolve in `DateTimeService` from config. A zod default here
   once made the entire configuration system unreachable for a year.
3. **`iso` is UTC; token patterns render in `timezone` (default: host).** `Z`/`ZZ` are
   real offset tokens. Never put a literal `Z` in a pattern. `structuredContent` states
   the same instant from every clock (`iso`/`utc`, `local`+`offset`+`timezone`,
   `epochMs`) so a consumer never has to infer which one a string was -- keep it that way.
   All zone maths goes through `TimeZone.ts` (Intl, no library); the host zone is not a
   special case.
4. **A format string must contain a token.** `validateFormat` rejects free text. It
   used to return `true` for everything, so `"what time is it"` was echoed back as the
   datetime.
5. **Look up `DEFAULT_FORMATS` with `hasOwnProperty`.** `format: "constructor"` once
   resolved through the prototype chain to a function and crashed inside `replace`.
6. **An explicitly requested provider that fails must throw.** Silent fallback to the
   local clock only when no provider was named.
7. **`MCPServer.stop()` must not call `process.exit`.** `index.ts` owns the process;
   the integration suite instantiates the server and would die otherwise.
8. **Tests must pass in any timezone.** Derive expected values from the same `Date`
   rather than hardcoding UTC digits. CI runs Ubuntu (UTC); developers usually don't.
9. **The version string lives in `package.json` only.** `MCPServer.ts` reads it via
   `require`. It used to be hardcoded in twelve places.
10. **Don't document a feature that isn't wired.** The old docs described a cache, a
    config watcher and a plugin system that existed only in prose. `docs/PRD.md`,
    `SRS.md`, `Architecture.md`, `TaskList.md`, `TechnicalNotes.md` and `blogs/` are
    gitignored for that reason; treat them as untrusted if they are on disk.

## Dependencies

- `@modelcontextprotocol/sdk` ^1.30 -- ships dual CJS/ESM. The 0.5 line was ESM-only
  and the CommonJS build threw `ERR_REQUIRE_ESM` on every Node before 22.12. The CI
  matrix launches `dist/index.js` on 18/20/22 specifically to catch that class of bug.
- `zod` ^3 -- schemas only.

## Known gaps (deliberate, tracked in docs/v2/MIGRATION.md)

Logger correlation IDs contaminate across requests (logs only). Multi-character tokens like `MMMM` mangle because `MM` matches inside them. The
default `remote` endpoint (`worldtimeapi.org`) is unreachable, so that provider fails
loudly out of the box. `examples/test-mcp-integration.js` asserts nothing.
