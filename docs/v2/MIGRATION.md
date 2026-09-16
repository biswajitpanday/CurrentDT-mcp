# Migration Notes

Two hops: `1.1.7 → 1.1.8` (already done, on `v1.1.8`) and `1.1.8 → 2.0.0` (planned).

---

## 1.1.7 → 1.1.8 — shipped

All of these are deliberate. Most are bug fixes that happen to change observable
behaviour, which still makes them breaking for anyone who depended on the bug.

### Behavioural

| change | who is affected |
|---|---|
| A `format` containing no recognised token is **rejected**. Previously the input string was returned verbatim as if it were the datetime. | Anyone passing free text, e.g. `"what time is it"`. This was the most damaging v1 bug. |
| A literal `Z` in a token pattern now renders the **real UTC offset**. Previously local digits were stamped `Z`, falsely claiming UTC. | Non-UTC hosts only. On a UTC host the output is byte-identical. |
| `format: "constructor"` (and `toString`, `valueOf`, `hasOwnProperty`) is rejected. Previously it resolved through the prototype chain to a function and crashed inside `String.replace`. | Anyone passing an arbitrary string. |
| An **explicitly requested** provider that fails now throws. Previously it silently returned local time and reported success. | Callers passing `provider: "remote"`. The implicit fallback still applies when no provider is named. |
| `defaultFormat`, `defaultProvider` and every `CURRENTDT_*` variable now actually take effect. | Anyone with a config file or those env vars set — behaviour changes from "silently ignored" to "applied". |

### Packaging

| change | who is affected |
|---|---|
| `@modelcontextprotocol/sdk` `^0.5.0` → `^1.30.0`; protocol negotiates `2025-06-18` instead of `2024-11-05`. | All clients. |
| `engines` `>=16` → `>=18`. | Nobody in practice — SDK 0.5 was ESM-only, so the CommonJS build threw `ERR_REQUIRE_ESM` on every Node before 22.12. The package **could not start** on 16/18/20. This change widens real compatibility. |
| Config keys `cache`, `customFormats` and `providers.*.enabled` removed from the schema. | Nobody functionally — none were ever read. Existing config files keep working; zod strips the unknown keys without erroring. |
| Barrel files (`dist/types/index.js` etc.) removed. | Only deep importers. `main` exports nothing, so this is near-zero risk. |
| `examples/mcp-configs/` removed. | Nobody could have used them — all four were invalid JSON (a `/* … */` comment after the closing brace). The README snippets are valid. |

### Not fixed in 1.1.8

Carried into v2 knowingly:

- `iso` still returns UTC while token formats return local time. Documented and
  detectable via the `Z` token, but not eliminated — Phase 1 retires it properly.
- No `timezone` parameter, and the input schema is `.strict()`, so passing one errors.
- Multi-character tokens like `MMMM` still mangle, because `MM` matches inside them.
- Logger correlation IDs contaminate across requests (logs only; suppressed at `error`
  level in server mode).
- The default remote endpoint `worldtimeapi.org` is unreachable, so `remote` is dead out
  of the box. It now fails loudly rather than silently.
- `examples/test-mcp-integration.js` asserts nothing and always reports success.

---

## 1.1.8 → 2.0.0 — in progress on `feat/v2-temporal-context`

Expected to be a major version. Confirmed so far (Phase 1):

| change | who is affected |
|---|---|
| Tool responses carry `structuredContent` conforming to a declared `outputSchema`, alongside the unchanged text content. | Additive. Old clients see the same text string as 1.1.9. |
| Bad input and provider failures are returned as **`isError` tool results**, not JSON-RPC protocol errors (`-32603`). This is the spec's channel for tool failures and lets the model read the message and retry. | Anyone matching on JSON-RPC error codes. |
| Unknown argument keys are **ignored** rather than rejected. The 1.x schema was `.strict()`, so a client sending e.g. `timezone` got a hard error; the SDK's schema strips unknown keys. | Relaxes a failure; nothing that worked before breaks. |
| `provider` is validated against an enum by the SDK before the handler runs; an unknown value is an `isError` result naming the allowed values. | Same outcome as before, better message. |
| The tool description and server `instructions` now tell the model to call the tool before writing any date. | Behavioural, not API. |

Still anticipated:

1. **Response shape.** Tool responses gain `structuredContent`. The `content` text
   string is retained for older clients, but its exact wording may change — callers
   parsing it should move to `structuredContent`.
2. **`timezone` becomes a legal argument.** Additive, and it relaxes a current hard
   error rather than introducing one.
3. **Filesystem access.** `next_timestamp_for` reads a directory. Deployments that
   assumed this server never touches disk need to know.
4. **Possible package rename** for discoverability. If taken, publish under both names
   with the old one deprecated and pointing at the new — do not orphan existing users.

### Migration rule

Anything that changed silently in v1 must change loudly in v2. The lesson from this
audit is not that v1 had bugs — it is that every one of them failed quietly: a wrong
timezone with no marker, a rejected config with no warning, a substituted provider
reported as success, a disabled test suite reporting green.
