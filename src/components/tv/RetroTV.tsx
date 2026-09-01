import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import gsap from 'gsap'
import type { Group } from 'three'
import { TV_DEPTH, TV_HEIGHT, TV_POSITION, TV_WIDTH } from '@/cores/const/scene'
import { KNOB_DETENT_ANGLE, KNOB_DRAG_SENSITIVITY, KNOB_SNAP_DURATION } from '@/cores/const/interaction'

// Body / screen / knob are separate objects (not one fused mesh) because
// the knob needs its own rotation pivot and the screen needs its own
// material once texture-swapping lands — see CLAUDE.md Phase plan.
export function RetroTV() {
  const knobPivotRef = useRef<Group>(null)

  // OrbitControls listens on the canvas DOM element directly (outside R3F's
  // synthetic event tree), so dragging the knob would spin the camera at
  // the same time unless we explicitly disable it for the duration of the
  // drag. `controls` here is whatever instance registered via `makeDefault`
  // on <OrbitControls> in Experience.tsx — typed loosely because R3F's
  // store only guarantees an EventDispatcher, not the OrbitControls API.
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null

  // Not consumed anywhere yet — Phase 2 (screen texture system) will read
  // this to pick which channel/project preview to show. Keeping the drag
  // mechanic and the content-switching wiring as separate steps, same as
  // the DVD player tray landed before it was wired to anything either.
  const [, setChannelIndex] = useState(0)

  useEffect(() => {
    const pivot = knobPivotRef.current
    return () => {
      if (pivot) gsap.killTweensOf(pivot.rotation)
      // Safety net: if this unmounts mid-drag (e.g. a scene switch),
      // don't leave OrbitControls permanently disabled for whatever
      // replaces it.
      if (controls) controls.enabled = true
    }
  }, [controls])

  const bindKnobDrag = useDrag(({ first, last, delta: [dx], event }) => {
    const pivot = knobPivotRef.current
    if (!pivot) return

    // Otherwise a ray that hits the knob can still carry on to whatever
    // sits farther behind it (the TV body, the DVD player) and fire that
    // object's own handlers too — see DVDPlayer's handleClick for the
    // matching half of this fix.
    event.stopPropagation()

    if (first) {
      // A tween from the previous release might still be settling into its
      // detent — a new grab should take over immediately, not fight it.
      gsap.killTweensOf(pivot.rotation)
      // `controls` is a live three.js OrbitControls instance handed out by
      // useThree, not React state — toggling .enabled imperatively is the
      // intended way to use it, same as mutating pivot.rotation.z below.
      // oxlint-disable-next-line react/immutability
      if (controls) controls.enabled = false
    }

    pivot.rotation.z -= dx * KNOB_DRAG_SENSITIVITY

    if (last) {
      if (controls) controls.enabled = true
      const steps = Math.round(pivot.rotation.z / KNOB_DETENT_ANGLE)
      const snapped = steps * KNOB_DETENT_ANGLE
      gsap.to(pivot.rotation, { z: snapped, duration: KNOB_SNAP_DURATION, ease: 'back.out(2)' })
      setChannelIndex(steps)
    }
  })

  return (
    <group name="tv" position={TV_POSITION}>
      <group name="tv-body" position={[0, TV_HEIGHT / 2, 0]}>
        <RoundedBox
          args={[TV_WIDTH, TV_HEIGHT, TV_DEPTH]}
          radius={0.02}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#d4c5a0" roughness={0.6} metalness={0.1} />
        </RoundedBox>
      </group>

      {/* Placeholder screen — flat plane for now, gets a canvas/texture material in Phase 2 */}
      <mesh name="tv-screen" position={[0, TV_HEIGHT * 0.56, TV_DEPTH / 2 + 0.002]}>
        <planeGeometry args={[TV_WIDTH * 0.62, TV_HEIGHT * 0.5]} />
        <meshStandardMaterial color="#0a1a0a" emissive="#39ff14" emissiveIntensity={0.08} />
      </mesh>

      {/* Pivot for the channel knob — rotation.z is what drag/snap animate.
          Rotating THIS group (not the knob mesh's own rotation) spins the
          knob around its own barrel axis, because the group isn't rotated
          relative to world Z and the knob mesh's fixed x-rotation just lays
          the cylinder so that barrel axis points along world Z already. */}
      <group
        name="tv-knob-pivot"
        ref={knobPivotRef}
        position={[TV_WIDTH * 0.32, TV_HEIGHT * 0.18, TV_DEPTH / 2 + 0.015]}
      >
        <mesh
          castShadow
          rotation={[Math.PI / 2, 0, 0]}
          {...bindKnobDrag()}
          onPointerOver={() => { document.body.style.cursor = 'grab' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <cylinderGeometry args={[0.035, 0.035, 0.03, 20]} />
          <meshStandardMaterial color="#3a2e1e" roughness={0.5} />
        </mesh>

        {/* Indicator tick — the knob is a plain cylinder, otherwise
            rotationally symmetric, so without a visible marker turning it
            would look like nothing is happening at all. */}
        <mesh position={[0.022, 0, 0.017]} castShadow>
          <boxGeometry args={[0.01, 0.004, 0.004]} />
          <meshStandardMaterial color="#e8e8d0" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
