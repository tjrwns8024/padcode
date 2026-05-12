# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite exists. Verify behavior by running the dev server.

## Architecture

PadCode is a **frontend-only** Next.js 15 SPA (no backend, no DB). State is in-memory only — nothing is persisted to localStorage yet.

### Data flow

```
DSL code (string)
  → compile() in lib/dsl/builder.ts   ← eval via new Function()
  → CompiledSound { trigger(), dispose() }
  → triggerCellCode() in lib/audio/engine.ts  ← caches compiled sounds per cell
  → Tone.js audio graph → getMaster() gain node → Tone.Destination
                                               ↘ Analyser (FFT) → Visualizer
                                               ↘ Recorder → WebM blob
```

### State stores (Zustand)

- `stores/cells.ts` — 16 CellData objects keyed by `r{row}c{col}`, holds DSL code + playMode + looping flag
- `stores/ui.ts` — selectedCellId, pulsingCellId, performance mode (`live`/`rec`/`play`), BPM
- `stores/recording.ts` — WebM blob URL, recording state, duration
- `stores/samples.ts` — user-uploaded sample entries (object URLs)

### DSL system

`lib/dsl/builder.ts` exports a `SoundBuilder` class with chainable Korean/English methods. `compile(code)` runs `new Function(...dslBindings, "return (${code}).build()")` — the entire DSL is evaluated as a JS expression. English method aliases are attached dynamically to `SoundBuilder.prototype` at module load via `ENGLISH_TO_KOREAN_METHODS`.

Korean↔English mapping: `사인파↔sin`, `노이즈↔noise`, `샘플↔sample`, `게인↔gain`, `로우패스↔lowpass`, `밴드패스↔bandpass`, `딜레이↔delay`, `피치다운↔pitch`, `스무딩↔smooth`, `에코↔echo`, `스텝↔step`, `확률↔prob`.

### Audio engine

`lib/audio/master.ts` lazily creates a singleton Tone.js graph: `Gain(0.9) → Destination + Analyser(fft,64) + Recorder`. All DSL-compiled sounds connect to this master gain. `ensureAudioContext()` must be called before any audio (browser autoplay policy).

`lib/audio/engine.ts` maintains a `Map<cellId, {code, sound}>` cache — recompiles only when code changes.

### Keyboard input

`lib/keymap.ts` defines a 4×4 grid mapped to `["1","2","3","4"] / ["q","w","e","r"] / ["a","s","d","f"] / ["z","x","c","v"]`. Uses `e.code` (physical key) to be IME-independent.

`hooks/useKeyboardTrigger.ts` skips events when focus is inside `.cm-editor` or an input element.

### Key UI constraints

- `"use client"` is required on all components and hooks (Tone.js uses Web Audio which is browser-only)
- The editor (CodeMirror) must not capture keyboard events while the pad is being played — `isEditorFocused()` check in the keyboard hook handles this
- Right-click on a pad toggles loop mode; `onContextMenu` calls `toggleLoop`

### Missing MVP features (as of initial commit)

Per `PADCODE_CONTEXT.md` acceptance criteria, not yet implemented:
- Per-cell mini visualizer (instrument-type canvas animation inside each Pad)
- Live/Recording/Playback mode switch UI (mode state exists in `stores/ui.ts` but no buttons)
- Playback mode via event-timeline replay (current recording is raw audio WebM, not trigger events)
- Grid size customization (hardcoded 4×4)
- Light/dark theme toggle
