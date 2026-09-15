# CLAUDE.md

resume-tv-3d — React + TypeScript portfolio rendered as a real 3D scene
(react-three-fiber), successor to My-RetroTV (which was CSS-only, no WebGL).
See README.md for concept and component map, [PLANNING.md](./PLANNING.md) for
current progress, decision log, and what's next.

## Working Rules

1. 開始寫程式前先思考——想清楚要怎麼做、會動到哪些檔案，不要邊寫邊想
2. 先讀再寫——改一個檔案前先讀過目前的內容，不要憑印象/猜測就下手改
3. 不要隱藏尚未完成的工作——沒做完、沒驗證過的部分要明講，不要包裝成已完成
4. 多問問題，不要用猜的——不清楚使用者要什麼就直接問，不要自己腦補一個方向做下去
5. 遇到卡住/處理不了的事情，先暫停——同一個問題最多重試兩次，還是不行就停下來回報，不要一直悶頭試
6. 沒有明確被告知要 commit，就不要自己 commit
7. 備注（comments）簡單清楚為主——不要寫廢話，只寫「為什麼」這麼做，不寫「做了什麼」（跟下面 TypeScript 慣例那條一致）

## Tech Stack

| Role | Package |
|------|---------|
| Framework | React 19 + TypeScript (strict) |
| Build | Vite — use `@/` alias for all `src/` imports |
| 3D | three + @react-three/fiber + @react-three/drei |
| Animation | GSAP for camera dolly / DVD insert sequences; `useFrame` for per-frame mesh motion |
| Styling | CSS Modules |

## Screen render strategy (decided — don't relitigate without reason)

The TV screen mesh shows a **texture**, not live DOM. Two states only:

1. **In-scene**: screen material's texture is a static preview image/canvas
   per channel or project. Switching channels swaps the texture. This keeps
   the screen correctly lit/reflective/bloomed as a real 3D surface.
2. **Fullscreen overlay**: clicking a channel dollies the camera in, fades
   the 3D screen texture out, and mounts a `position: fixed` DOM overlay
   (`src/components/overlay/`) with the actual resume UI — plain React +
   CSS, full interactivity, zero 3D involved. Closing reverses the sequence.

Do not reach for `drei <Html transform>` or DOM→canvas render-to-texture for
the resume content — both were considered and rejected in favor of this
split (see project chat history / commit messages for the reasoning).

## Data Layer

- `src/data/channels.ts` — `CHANNELS: Channel[]`
- `src/data/projects.ts` — `PROJECTS: Project[]` (one per DVD)
- No API calls — everything is static

## Cores

- `src/cores/types/` — shared TS interfaces, import from here not `src/data/`
- `src/cores/const/` — shared numeric constants (camera distances, dolly
  timing, rotation speeds) used in ≥ 2 files or forming one tuning set

## R3F Rules

- `<Canvas>` render loop is independent of React's — never call `setState`
  every frame from inside `useFrame`; mutate refs/materials directly instead
- Every `useFrame` callback must be cheap; branch out early if a ref is null
- Dispose GPU resources (geometries/materials/textures) you create manually
  outside JSX — drei/R3F handle disposal for anything declared in JSX
- Folder ownership:
  - `src/components/scene/` — Canvas, camera, lights, controls only
  - `src/components/tv/` — TV mesh + screen material/texture logic
  - `src/components/dvd/` — DVDPlayer/DVD/DVDCase meshes
  - `src/components/overlay/` — fullscreen DOM overlay, no 3D imports here

## TypeScript / React conventions (carried over from My-RetroTV)

- Strict mode on, no implicit `any`, no `as any`
- Functional components only, named exports everywhere — `App` is the only
  default export
- No comments describing WHAT code does; only WHY when non-obvious
- **Comments are written in Traditional Chinese** (code/identifiers stay
  English) — this diverges from My-RetroTV, which used English comments
- No barrel `index.ts` files — import from the concrete module path

## Phase Plan

Status detail and the running decision log live in [PLANNING.md](./PLANNING.md) — this is just the checklist skeleton.

0. ✅ Scaffold — Canvas, lights, OrbitControls, one rotating placeholder mesh
1. ✅ Blockout — TV / DVDPlayer / DVD as primitive geometry, roughly to scale
2. Screen content — wire up texture-preview + fullscreen-overlay split above
3. Interaction — in progress: DVD player tray open/close ✅, TV knob drag (next), DVD case open + select
4. Polish — HDRI environment, bloom on the CRT glow, shadows, material detail
5. (optional) Blender pass — swap blockout meshes for Blender-authored GLBs (CRT rear taper is the one known must-do here)

## Git

- Branches: `feat/<name>` · `fix/<name>` · `style/<name>`
- Commits: imperative present tense
- No `console.log` in production paths
