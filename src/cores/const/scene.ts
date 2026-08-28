// 1 unit = 1 meter. Real-world reference dims (cm) scaled ×1.2 for stage presence,
// then converted to units. Keep this ratio if you rescale anything — see CLAUDE.md.

export const TV_WIDTH = 0.54
export const TV_HEIGHT = 0.48
export const TV_DEPTH = 0.54

export const DVD_PLAYER_WIDTH = 0.8
export const DVD_PLAYER_HEIGHT = 0.06
export const DVD_PLAYER_DEPTH = 0.54

// Raised front lip along the whole front edge — real AV chassis aren't a
// uniform slab, the front panel sits a bit proud of the flat top. Sits on
// top of the main body, flush with its front face.
export const DVD_PLAYER_LIP_HEIGHT = 0.025
export const DVD_PLAYER_LIP_DEPTH = 0.05

export const DVD_CASE_WIDTH = 0.02
export const DVD_CASE_HEIGHT = 0.16
export const DVD_CASE_DEPTH = 0.23

export const DVD_DIAMETER = 0.144
export const DVD_THICKNESS = 0.0014

// TV sits on the player's top surface; player sits on the ground (y = 0).
export const TV_POSITION: [number, number, number] = [0, DVD_PLAYER_HEIGHT, 0]
export const DVD_PLAYER_POSITION: [number, number, number] = [0, 0, 0]

// DVD case stands upright and leans against the TV's right side, resting
// on the same surface the TV stands on. This is the pivot at the case's
// BOTTOM edge (not its center) — rotating around the base is what makes
// the top tip toward the TV instead of swinging the whole box into it.
// Eyeballed pose, nudge after looking at a render.
export const DVD_CASE_BASE_POSITION: [number, number, number] = [
  0.33,
  DVD_PLAYER_HEIGHT,
  0.02,
]
export const DVD_CASE_LEAN_ANGLE = 0.3 // radians, tilt around Z — positive tips the top toward -X (the TV)

export const CAMERA_POSITION: [number, number, number] = [0.55, 0.75, 1.9]
export const CAMERA_TARGET: [number, number, number] = [0, 0.25, 0]
export const CAMERA_FOV = 45

export const ORBIT_MIN_DISTANCE = 0.6
export const ORBIT_MAX_DISTANCE = 3.5
