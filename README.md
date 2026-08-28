# resume-tv-3d — Personal Portfolio

A retro-themed 3D portfolio site built with React + Three.js (react-three-fiber).

Successor to [My-RetroTV](https://github.com/king970907/My-RetroTV), which faked the 3D
look with CSS transforms. This one uses real WebGL meshes, lighting, and a camera.

---

## Concept

```
3D Scene (Canvas)
├── RetroTV        — CRT television, screen shows a texture preview per channel
├── DVDPlayer       — accepts a DVD, "plays" it to open a project
└── DVDCase         — holds the DVD(s) representing portfolio projects

Fullscreen DOM Overlay
└── Mounted on click: camera dollies into the screen, the 3D texture preview
    fades out, and the real resume UI (plain React + CSS) takes over —
    fully interactive, no 3D involved while it's open.
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
│   └── overlay/        — Fullscreen DOM overlay shown when a channel is opened
├── data/               — channels.ts, projects.ts (static content)
├── cores/
│   ├── types/          — shared TS interfaces
│   └── const/           — shared tuning constants
├── hooks/
├── styles/
│   └── global.css      — design tokens + reset
└── main.tsx
```

## Status

Phase 0 (scaffold) done — Canvas renders, lit, orbit-controllable, one rotating
placeholder mesh standing in for the TV. See [CLAUDE.md](./CLAUDE.md) for the
phase plan.
