# v2 Tool Specification

The intended MCP surface for v2. **Nothing here is implemented yet** — this is the
contract to build against, and it should be edited when reality disagrees with it.

Phase numbers refer to `ROADMAP.md`.

---

## Design rule

Every response that carries a time must state which clock it came from. v1's single
worst defect was that `iso` returned UTC while every token format returned local time,
with nothing in the output to distinguish them. No v2 response may be ambiguous about
its timezone.

---

## `get_current_datetime` (shipped, 2.0.0)

Extends the existing tool. `format` and `provider` keep their v1.1.8 meaning.

**Input**

| param | type | required | notes |
|---|---|---|---|
| `format` | string | no | `"iso"`, a named pattern, or a token pattern. Falls back to configured default. |
| `provider` | `"local"` \| `"remote"` | no | Explicit choice fails loudly; see MIGRATION.md. |
| `timezone` | string | no | IANA name, e.g. `Asia/Tokyo`. Defaults to the host zone. **New in v2.** |

Note: the input schema is currently `.strict()`, which rejects unknown keys outright.
Adding `timezone` is what makes a previously hard-erroring argument legal.

**Output** — `content` keeps a plain string for older clients; `structuredContent`
conforms to `outputSchema`:

```jsonc
{
  "formatted":  "2026-08-21 17:32:43",   // the requested format, verbatim
  "iso":        "2026-08-21T15:32:43.591Z",
  "utc":        "2026-08-21T15:32:43.591Z",
  "local":      "2026-08-21T17:32:43.591+02:00",
  "offset":     "+02:00",
  "timezone":   "Europe/Berlin",          // IANA zone the local fields are in
  "epochMs":    1787412763591,
  "provider":   "local"                   // which clock actually answered
}
```

`provider` is part of the payload on purpose: v1 could silently answer from a different
clock than the caller asked for.

**Annotations:** `readOnlyHint: true`, `openWorldHint: false` (`true` when
`provider: "remote"` is in play, since that reaches the network).

---

## `convert_timezone` (shipped, 2.0.0)

| param | type | required |
|---|---|---|
| `time` | string (ISO 8601) | yes |
| `from` | string (IANA) | no — inferred from `time`'s offset when present |
| `to` | string (IANA) | yes |

Returns the same structured shape as above (minus `provider`), plus `from` (the zone
the input was interpreted in) and `dstTransition` — true when the instant is within an
hour of a DST changeover in the target zone. The DST edge is the entire reason this tool
is worth shipping — an LLM guessing offsets gets it wrong.

Also accepts an optional `format` for the text result. A wall-clock time in the
spring-forward gap resolves to after the gap; an ambiguous autumn time resolves to its
first occurrence; an offset-less `time` with no `from` is refused rather than guessed.

---

## `currentdt://now` resource (Phase 3)

The differentiating half of v2: context the model always has, rather than a call it must
remember to make.

```jsonc
{
  "date":     "2026-08-21",
  "time":     "17:32:43",
  "iso":      "2026-08-21T15:32:43.591Z",
  "timezone": "Europe/Berlin",
  "offset":   "+02:00",
  "weekday":  "Friday",
  "isoWeek":  34,
  "quarter":  "Q3",
  "epochMs":  1787412763591
}
```

Resources are read repeatedly, so this must be cheap and must never block on the
network — always the local clock, never `provider: "remote"`.

## `current_datetime` prompt (Phase 3)

Injects the same values as text for hosts that surface prompts but not resources.

## Server `instructions` (Phase 3)

Set on initialize. States today's date and that the model's training data probably
predates it. This is what kills wrong-year copyright headers and changelog entries at
the source, before any tool call happens.

---

## `next_timestamp_for` (Phase 4)

The repo-aware tool. No other datetime MCP does anything project-aware.

| param | type | required | notes |
|---|---|---|---|
| `directory` | string | yes | e.g. `db/migrations`. No implicit scanning outside it. |
| `hint` | string | no | Format hint when the directory is empty or ambiguous. |

**Behaviour**

1. List the directory.
2. Infer the timestamp convention from existing entries (`20260821153243_`,
   `2026-08-21-153243_`, `V12__`, …).
3. Return a timestamp in that convention, guaranteed to sort **strictly after** the
   newest existing entry — bump it if the current time would collide or sort earlier,
   which happens with clock skew and with sequence-based conventions.

**Output** must include the inferred convention and the entry it sorted against, so the
caller can see the reasoning:

```jsonc
{
  "timestamp": "20260821153243",
  "convention": "YYYYMMDDHHmmss",
  "sortedAfter": "20260819104501_add_users.sql",
  "inferredFrom": 14,        // how many files the inference used
  "confident": true
}
```

**Failure mode:** when no convention can be inferred and no `hint` is given, return an
error saying so. Guessing a format here silently corrupts migration ordering, which is
far worse than refusing.

`openWorldHint: false`, but this tool reads the filesystem — a real capability change
from v1, and it must be documented as such.

---

## Phase 5 tools

`add_time`, `subtract_time`, `calculate_duration`, `get_business_days`,
`next_cron_occurrence`. Specify these when Phase 5 starts, not before — the shape should
follow whatever library is chosen rather than being invented here first.
