# resume-tv-3d — Personal Portfolio

A retro-themed 3D portfolio site built with React + Three.js (react-three-fiber).

Successor to [My-RetroTV](https://github.com/king970907/My-RetroTV), which faked the 3D
look with CSS transforms. This one uses real WebGL meshes, lighting, and a camera.

---

## Concept

```
3D Scene (Canvas)
├── RetroTV        — CRT television, screen shows a texture preview per page
├── DVDPlayer       — accepts the DVD, "plays" it to open the project channels
└── DVDCase         — holds the single interactive DVD representing the
                       portfolio projects (opens, disc can be selected/inserted)

Fullscreen DOM Overlay
└── Mounted on click: camera dollies into the screen, the 3D texture preview
    fades out, and the real resume/project UI (plain React + CSS, black &
    white pixel + terminal look) takes over — fully interactive, no 3D
    involved while it's open.
```

The screen is never rendered as live DOM-inside-3D — see [CLAUDE.md](./CLAUDE.md)
under "Screen render strategy" for why.

## Tech Stack

| Role | Package |
|------|---------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| 3D | Three.js + react-three-fiber + drei |
| Animation | GSAP (camera dolly, DVD insert) |
| Styling | CSS Modules + CSS custom properties |

## Getting Started

```bash
npm install
npm run dev
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── scene/        — Canvas wrapper, lights, camera, orbit controls
│   ├── tv/            — RetroTV mesh, screen material/texture logic
│   ├── dvd/            — DVDPlayer, DVD, DVDCase meshes
│   └── ui/             — Fullscreen DOM overlay shown when the screen is
│                          opened: terminal/ (shared TerminalFrame), resume/,
│                          projects/, plus the intro/play-hint overlays
├── data/               — projects.ts, resumeContent.ts, screenPages.ts (static content)
├── cores/
│   ├── types/          — shared TS interfaces
│   └── const/           — shared tuning constants
├── hooks/
├── styles/
│   └── global.css      — design tokens + reset
└── main.tsx
```

## Status

Core experience is built and playable end to end: TV / DVD player / DVD /
DVD case are all Blender-authored models, the case opens and the disc can be
selected and inserted into the player, and both the résumé (3 pages) and
project (3 channels) content render through a shared black & white pixel +
terminal ("Undertale-style") overlay. Remaining work is polish — material
detail, lighting mood, HDRI/bloom. See [CLAUDE.md](./CLAUDE.md) for the phase
plan and [PLANNING.md](./PLANNING.md) for the detailed progress/decision log.
