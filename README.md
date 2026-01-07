# Occupational Builder

**Build version:** v0.7.3  
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

### v0.7.3
- Restored straight dimension text rotation and stabilized drag offset math for annotations.

### v0.7.2
- Fixed dimension drag behavior, updated label rotation with object transforms, and hid wing measurement toggles for landings.

### v0.7.1
- Refined 2D dimension offsets and label orientation, including improved wing placement and drag behavior.

### v0.7.0
- Added CAD-style 2D dimension annotations with configurable offsets, wing-specific measurements, and per-object toggle defaults set to off.

### v0.6.2
- Show snap guide lines during object-to-object resize snapping and clear them when resizing ends.

### v0.6.1b
- Normalised resize handles to stay a consistent on-screen size at all zoom levels and hide while dragging to remove lingering ghosts.
- Locked resizing to respect the 100mm minimum without flipping growth direction, aligned unsnapped resizing to 1mm steps, and added snap-to-object alignment while resizing.
- Fixed snap-to-grid toggling during resize so grid-off uses 1mm increments.

### v0.6.0
- Added mm-snapped corner resize handles for ramps and landings with 100mm minimums, blue hover highlights, and wing-aware ramp bounding that keeps anchors fixed while resizing the main body.

### v0.5.0
- Split snapping controls into separate grid/object toggles with configurable 1/10/100/1000mm increments plus status readouts.
- Updated snapping logic and autosave to honour the selected increment, prioritise object magnetism, and keep grid visuals aligned for large steps.

### v0.4.5
- Locked the document and app shell to the viewport with hidden overflow (with clip where supported) to remove page scrollbars while preserving scrolling within the left and right panels.

### v0.4.4
- Adjusted page and shell layout sizing to remove global scrollbars while keeping internal panels scrollable at varied viewport widths.

### v0.4.3
- Added ramp Inspector arrow toggle plus greyed-out Gradient and Ratio readouts derived from Length and Height.

### v0.4.2
- Rebuilt ramp wings as triangular extensions aligned to the arrow direction with single-pass stroking, attachment seams, and updated bounds/hit-testing.

### v0.4.1
- Updated ramp wings to render as tapered triangles that share the ramp’s stroke styling and hit-testing/selection bounds.

### v0.4.0
- Added measurements checkboxes in the Inspector with elevation-aware disabling, introduced ramp wing controls, and rendered ramp wings in 2D with selection and snap-aware bounds.

### v0.3.9
- Added the Inspector panel skeleton with shared dimension, elevation, rotation, quick-rotate, lock, and measurements placeholder controls for ramps and platforms while moving rotate buttons out of the top bar.

### v0.3.8
- Added a single normalised object update pipeline with shared helpers for clamping millimetre values and normalising rotation.
- Routed rotations, drags, and keyboard nudges through the new updater to keep undo steps clean while preparing the Inspector pathway.

### v0.3.7
- Standardised ramp and landing objects on a shared base shape (dimensions, elevation, rotation, locking, measurements) ready for future stairs support.
- Updated canvas and persistence to use a landing tool/kind discriminated union with defaulted measurement fields.

### v0.3.6
- Enlarged workspace to 40m x 40m with updated grid bounds and clamping.
- Reduced maximum zoom-out to keep the grid comfortably visible.
- Tightened panning clamps so most of the workspace stays in view at all zoom levels.

### v0.3.5
- Added CAD-style pan/zoom with bounded 25m workspace and crisp adaptive grid.

### v0.3.4
- Added undo/redo with toolbar buttons and keyboard shortcuts.

### v0.3.3
- Prioritised object-to-object snap over grid snap so off-grid placements become valid targets, while preserving grid alignment on unsnapped axes only.

### v0.3.2
- Added CAD-style object-to-object snapping that aligns faces, centres, and points of interest while dragging with red guide visuals.
- Kept grid snapping unchanged, maintained locked-object behaviour, and ensured build stability alongside UI polish.

### v0.3.1
- Overhauled 2D grid/snapping with 100mm minor and 1000mm major lines plus top-left anchored placement and dragging tied to the grid.
- Defaulted Snap to ON, applied 100mm live snapping for drag, placement, and arrow nudging (10mm when off), and preserved centre-based storage.
- Simplified ramp/platform visuals with sharp corners and maintained build health.

### v0.3.0
- Added debounced autosave to localStorage with schema versioning and timestamped payloads.
- Restored saved projects on load while hydrating objects, tools, mode, and snap state.
- Triggered saves after committed edits including placement, deletion, drag/resize ends, rotation, and snap toggles.

### v0.2.6
- Centralised millimetre↔pixel conversions with snapping helpers and grid-aware scaling.
- Updated ramp/platform rendering to use centre-based groups with rotation and drag snapping in mm space.
- Ensured placement and movement convert pointer pixels to millimetre centres while respecting snap.

### v0.2.5
- Simplified tools by removing Move, defaulting to no active tool, and matching platform styling to ramps without on-shape labels.
- Added snap state indicator, renamed Snap control, and ensured click-to-place/delete tools reset after single use with consistent selection outlines.
- Improved interaction polish with grabbing cursors on drag plus keyboard shortcuts for ramps, platforms, delete, Esc clearing, backspace delete, and arrow-key nudging.

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
