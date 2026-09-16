# v2 Roadmap

**Branch:** `feat/v2-temporal-context` (branched from `v1.1.8`)
**Status:** Phase 1 implemented on the branch, unmerged. Phases 2–6 not started.

> Keep this directory small. The previous `docs/` tree reached 1,284 lines describing a
> tool whose irreducible logic is 22 lines, and its checkboxes claimed work that was
> never done. Three documents is the budget: this one, `TOOL-SPEC.md`, `MIGRATION.md`.
> Nothing here is marked complete until it is merged and verified.

---

## 1. Why v2

v1.1.8 made the tool correct. It did not make it wanted.

Measured during the August 2026 audit:

| package | downloads/month |
|---|---|
| `time-mcp` | 6,336 |
| `@vreme/temporal-mcp` | 409 |
| **`@strix-ai/currentdt-mcp`** | **186** |
| `mcp-datetime` | 103 |

This package trended 283 → 176 → 125 → 120 over May–Aug 2026, a ~57% decline. One
likely cause is now fixed: the ESM/CommonJS mismatch meant the package could not start
on Node 16/18/20 at all. **Watch the download numbers after 1.1.8 ships before
committing to the full v2 scope** — that signal is worth more than any assumption here.

The positioning problem remains regardless. "Return the current datetime" is
commoditised: hosts often inject the date, any agent with a shell has `date`, and the
official `mcp-server-time` plus at least four npm packages cover current-time and
timezone conversion.

## 2. What is and isn't differentiated

Checked against `time-mcp`, `mcp-server-time`, `mcp-time-server-node`,
`@vreme/temporal-mcp`, `chrono-mcp` and `mcp-datetime`:

- **Saturated** — current time, timezone conversion, date arithmetic, business days,
  cron. `mcp-time-server-node` alone ships 10 tools with 703 tests. Entering here is a
  commodity race.
- **Open** — nothing in the category is *project-aware*, and every one of them is
  tools-only. No competitor exposes MCP resources or prompts.

v2 therefore leads with the open ground and treats the saturated lane as catch-up
built on a library, not hand-rolled.

## 3. Phases

Ordered so that each phase is independently shippable. Do not start a phase before the
one above it is merged.

### Phase 0 — Ship 1.1.8 *(prerequisite)*
Smoke test in a real Cursor or Claude Desktop instance before publishing: the SDK major
bump changes the handshake and no automated test exercises a real client. Then publish
and observe downloads for a fortnight.

### Phase 1 — Structured output *(implemented on branch; not merged, not published)*
Retire the UTC-vs-local ambiguity instead of documenting around it.

- Migrate to the SDK 1.x `McpServer` / `registerTool` API (the dependency upgrade
  already landed in 1.1.8; only the call style remains).
- Declare `outputSchema` and return `structuredContent` carrying UTC, local, offset,
  IANA zone and epoch **together**, so no caller has to infer which clock it got.
- Keep a human-readable `content` string for clients that ignore structured output.
- Add tool annotations (`readOnlyHint: true`, `openWorldHint: false`) and a server
  `instructions` string.

**Done when:** a single `tools/call` response states its own timezone unambiguously,
and old clients still receive a usable text string.

*Implementation notes:* `src/server/tools.ts` + `DateTimeService.resolve()`.
`ToolRegistry` and `RequestHandler` are gone — the SDK's `registerTool` does their job.
The integration suite now drives the real `McpServer` through a `Client` over
`InMemoryTransport`, so protocol behaviour is tested rather than internal getters.
**Before release:** the publish workflow runs `npm publish` with no `--tag`, so a
`2.0.0-*` prerelease would land on `latest` and reach every `npx -y` user. Add a
dist-tag step (or publish `2.0.0` outright) before bumping the version on this branch.

### Phase 2 — Timezone support
Table stakes, not differentiation, but v1 has none at all and `.strict()` currently
hard-errors on a `timezone` argument.

- `timezone` parameter accepting IANA names, via `Intl.DateTimeFormat` — no new runtime
  dependency needed for formatting.
- A conversion tool between two zones.
- DST correctness is the whole point: cover a spring-forward and autumn-back instant in
  tests, plus a half-hour zone (`Pacific/Chatham`, +12:45) and a zone whose offset
  changed historically.

**Done when:** the tool answers "what time is it in Tokyo" and converts across a DST
boundary correctly.

### Phase 3 — Ambient time context *(differentiator)*
No competitor does this. Stop being a tool the model must remember to call.

- MCP **resources** (e.g. `currentdt://now`) carrying date, timezone, ISO week and
  quarter, so hosts can attach them to context automatically.
- An MCP **prompt** for injecting the same.
- Use the server `instructions` field to state the current date explicitly and note that
  the model's training data likely predates it — this attacks the wrong-year-in-header
  failure at its root rather than at the call site.

**Done when:** a client that never calls the tool still has today's date in context.

### Phase 4 — Repo-aware timestamps *(differentiator)*
No prior art found in any datetime MCP. This is the strongest claim v2 can make.

- A tool that reads a target directory (`db/migrations`, `CHANGELOG.md`, …), infers the
  existing naming convention from what is already there, and returns a timestamp that
  **matches that convention and sorts strictly after the newest existing entry**.
- Must degrade honestly: if no convention can be inferred, say so rather than guessing.
- Filesystem access is a real capability change — it needs a path parameter, no implicit
  scanning outside it, and `openWorldHint` set accordingly.

**Done when:** pointing it at a real migrations directory produces a filename that sorts
correctly and matches the surrounding files without being told the format.

### Phase 5 — Date math, business days, cron
Deliberately last. This is the saturated lane; entering it is a decision already taken,
but it should not consume effort before phases 3 and 4 exist.

- Build on Luxon or date-fns-tz plus a cron parser. Do not hand-roll calendar maths.

### Phase 6 — Distribution
Currently listed only on auto-scraped directories. `time-mcp` gets its reach from a
one-line Smithery install.

- Smithery listing, MCP registry entry, corrected `keywords`.
- README leads with `npx -y` (done in 1.1.8).
- Revisit the package name: `@strix-ai/currentdt-mcp` is scoped and non-obvious, and
  nobody searches for "currentdt".

## 4. Constraints carried from v1

Non-negotiable, learned the hard way:

1. **stdout is JSON-RPC only.** All logging to stderr. This is the one thing v1 always
   got right; a regression here breaks every client silently.
2. **No feature ships documented-but-unwired.** v1 shipped a cache, a config watcher and
   a plugin architecture that existed only in prose.
3. **No default may be applied at two layers.** A zod `.default()` over a config default
   is what made v1's entire configuration system unreachable.
4. **Tests must run in CI and must be timezone-independent.** v1's suite was disabled
   with `echo` and its assertions only held in UTC.
5. **One source of truth per value.** The version string lived in 12 places.

## 5. Open questions

- Does the 1.1.8 Node-compatibility fix move downloads on its own? Decides how much of
  phases 3–5 is worth building.
- Should repo-aware timestamps read the filesystem directly, or take the directory
  listing as a parameter so the server stays sandbox-friendly?
- Is a rename worth losing the existing (small) install base?
