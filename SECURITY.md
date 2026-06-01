# Security Policy

## Supported versions

XenolithGraph is pre-1.0. Only the latest published release receives security fixes.

| Version | Supported |
|---|---|
| `>= 0.x` (latest) | ✅ |
| Anything older | ❌ |

## Reporting a vulnerability

**Please do NOT open a public GitHub issue for security problems.**

Report privately via one of these channels:

- **GitHub Security Advisory** (preferred): use the "Report a vulnerability" button on the [Security tab](https://github.com/XenolithEngine/xenolith-graph/security) of the repository.
- **Email**: `security@xenolithengine.dev`

Include:
1. A description of the issue (what you can do, what you observed).
2. A minimal reproduction (a `xenolith.v1` JSON graph, a code snippet, or a step-by-step is enough).
3. The version(s) of `@xenolith/*` packages affected.
4. Your assessment of impact (data exposure, code execution, DoS, etc.).

We'll acknowledge receipt within 72 hours and aim to publish a fix within 14 days for critical issues. Coordinated disclosure timelines are negotiable for genuinely complex findings.

## In scope

- All published `@xenolith/*` npm packages
- The MCP server (`@xenolith/mcp-server` — WS bridge, token auth)
- The site (`xenolithengine.github.io/xenolith-graph`)

## Out of scope

- Issues in PIXI v8 itself (report to <https://github.com/pixijs/pixijs>)
- Issues in transitive dependencies that are already published advisories with a known fix — please open a regular PR bumping the version.
- "I can crash the editor with a hand-crafted malformed JSON" — that's expected; XenolithGraph trusts its host's input. Document the surprise instead of treating it as a security bug.
- Anything requiring physical access to the user's machine.

## Safe harbor

Good-faith research under this policy will not be pursued legally. We won't disable accounts, file CFAA claims, or DMCA-takedown reports against researchers who follow this process.
