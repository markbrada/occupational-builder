# Occupational Builder

**Build version:** v0.2.4  
**Status:** Active development (v1 scope)

Occupational Builder is a **design-only, browser-based ramp and platform builder** for occupational access scenarios.  
It is a **static web app** hosted on GitHub Pages with **no backend**, designed to be extended incrementally.

The tool focuses on **clear geometry, correctness, and exportable drawings**, not pricing, catalogues, or compliance automation (yet).

---

## Core Design Intent

### What this tool IS
- A **2D design tool** for ramps and platforms (landings)
- With a **view-only 3D preview**
- Producing **dimensioned PDF drawings**
- Units are **millimetres only**
- **Local-first** (localStorage initially)

### What this tool is NOT (by design)
- No BOM generation
- No pricing
- No user accounts
- No cloud sync
- No live product catalogues
- No compliance validation that blocks the user (warnings only)

This is intentional to keep v1 focused, robust, and easy to reason about.

---

## Target Users

- Occupational therapists (OTs)
- Access consultants
- Builders and estimators
- Designers preparing preliminary access layouts

---

## Technology Stack

### Frontend
- Vite
- React
- TypeScript

### 2D Editing (planned)
- Konva / react-konva

### 3D Preview (planned, view-only)
- Three.js
- @react-three/fiber
- @react-three/drei

### Export
- jsPDF (PDF only)

### Hosting
- GitHub Pages
- GitHub Actions for build & deploy

There is **no backend**.

---

## Architectural Principles

1. **Static-first**
   - Everything runs in the browser
   - Deployable as static files

2. **Local-first**
   - v1 uses localStorage
   - JSON export/import will be added early

3. **Single source of truth**
   - One internal model drives:
     - 2D canvas
     - Inspector
     - 3D preview
     - PDF export

4. **Incremental complexity**
   - One feature at a time
   - One green build per step

---

## v1 Functional Scope

### Tools (left toolbox)
- Ramp
- Platform (Landing)
- Move (dragging)
- Delete
- Snap toggle

No other tools in v1.

### Object Types

#### Ramp
Parameters (editable):
- Run (mm)
- Width (mm)
- Height (mm)
- Elevation (mm)
- Rotation (degrees)
- Arrow toggle
- Lock toggle

Derived (read-only):
- Gradient (degrees)
- Ratio (1:x)

#### Platform (Landing)
Parameters:
- Length (mm)
- Width (mm)
- Thickness (mm)
- Elevation (mm)
- Rotation (degrees)
- Lock toggle

---

## Behaviour Rules

- Objects are placed by selecting a tool and clicking empty canvas area
- Selection is always available by left-clicking any object
- Drag to move when the Move tool is active (locked objects cannot move)
- Resize via corner handles
- Rotation via inspector and quick rotate buttons
- Snap to grid ON by default
- 3D mode is **view-only** in v1
- All validation is **non-blocking warnings only**

---

## Export Rules

- PDF only
- Top-down dimensioned drawing
- Overall dimensions
- Ramp run, height, gradient, and ratio clearly labelled
- No BOM or pricing data

---

## Build & Deployment

- Builds with `npm run build`
- Deployed automatically via GitHub Actions
- Hosted on GitHub Pages
- `vite.config.ts` uses `base: "./"`

---

## Versioning Strategy

- **Semantic-style project versions**
- v1 = design-only tool
- Version is shown in README and (later) in UI
- Every meaningful change bumps the version

---

## Changelog

### v0.2.4
- Default selection on click with a dedicated Move tool for dragging, plus deletion respects empty-canvas clearing.
- Added quick rotate (-90°/+90°) buttons in the top bar and persisted rotation for ramps and platforms.
- Lightened the 2D grid styling and surfaced the app version directly in the header.

### v0.2.3
- Fix TypeScript types for BuilderState and 2D shape rendering (build fix).

### v0.2.2
- Added CAD-like 2D interaction model with explicit tool modes, single-shot placement, keyboard shortcuts, and status bar guidance.
- Implemented ghost previews, snapping-aware crosshair HUD, and reliable selection/move/delete workflows for ramps and platforms.
- Updated toolbox visuals with clear pressed states and contextual cursor feedback for each mode.

### v0.2.1
- Fixed 2D canvas panel layout to keep the canvas visible with proper sizing.
- Added responsive sizing and visible grid/debug label for the 2D Konva stage.

### v0.2.0
- Stable Vite + React + TypeScript baseline
- GitHub Actions deploy pipeline
- UI shell architecture in place
- No canvas logic yet

### v0.1.0
- Initial project bootstrap
- Green build baseline

---

## Development Discipline

- One step at a time
- Never break the green build
- No dependency changes without intent
- No scope creep in v1

For Codex and automation rules, see **AGENTS.md**.
