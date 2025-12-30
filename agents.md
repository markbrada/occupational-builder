# AGENTS — Occupational Builder Repository Rules (Codex + Automation)

## Allowed
- Read any files in this repository.
- Edit/create/delete files in this repository.
- Commit changes (via the GitHub web UI or the tool’s built-in commit action, if available).
- Output a short report: files changed + brief summary.

## Forbidden
- Run any shell commands (npm, node, git CLI, bash, etc.).
- Install dependencies.
- Require local execution.

## Workflow
- Work directly on branch: main.
- Do not mention PRs unless the user explicitly asks.
- Keep changes small and TypeScript-safe.

## Versioning and changelog policy (mandatory)

### Source of truth
- App version lives in: `src/app/version.ts`
  - `export const APP_VERSION = "X.Y.Z";`

### UI requirement
- Top bar must display: `Occupational Builder vX.Y.Z`

### README requirement
- Every meaningful change must:
  1) bump `APP_VERSION` (semver)
  2) add a matching entry in `README.md` under a Changelog section

### Version bump guidance
- Major (X.0.0): architecture or scope change
- Minor (X.Y.0): new feature
- Patch (X.Y.Z): bugfix / refactor / UI polish
