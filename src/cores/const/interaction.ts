// Shared animation tuning for click-driven part motion (tray, knob, case).
// One file because these values get compared/tuned against each other as
// the interactions are built out — see CLAUDE.md Phase plan.

export const DVD_TRAY_OPEN_DISTANCE = 0.14 // meters the tray slides out along +Z
export const DVD_TRAY_ANIM_DURATION = 0.5 // seconds

export const KNOB_DETENT_ANGLE = Math.PI / 6 // radians per channel step (30°)
export const KNOB_DRAG_SENSITIVITY = 0.01 // radians of rotation per pixel dragged
export const KNOB_SNAP_DURATION = 0.3 // seconds to settle into the nearest detent on release
