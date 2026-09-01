import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Group } from 'three'
import {
  DVD_PLAYER_DEPTH,
  DVD_PLAYER_HEIGHT,
  DVD_PLAYER_LIP_DEPTH,
  DVD_PLAYER_LIP_HEIGHT,
  DVD_PLAYER_POSITION,
  DVD_PLAYER_WIDTH,
} from '@/cores/const/scene'
import { DVD_TRAY_ANIM_DURATION, DVD_TRAY_OPEN_DISTANCE } from '@/cores/const/interaction'

const TRAY_CLOSED_Z = DVD_PLAYER_DEPTH / 3.5
const TRAY_OPEN_Z = TRAY_CLOSED_Z + DVD_TRAY_OPEN_DISTANCE

// Tray box dims — named so the lip (which has to sit flush with this
// box's own top/front faces) can reference them instead of repeating
// the same numbers in two places.
const TRAY_BOX_WIDTH = DVD_PLAYER_WIDTH * 0.3
const TRAY_BOX_HEIGHT = DVD_PLAYER_HEIGHT * 0.35
const TRAY_BOX_DEPTH = 0.25
const TRAY_BOX_Z = 0.005

// Tray is a separate object sitting at the front face — its pivot group's
// position.z is what we tween on click, body geometry never moves.
export function DVDPlayer() {
  const trayPivotRef = useRef<Group>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const pivot = trayPivotRef.current
    return () => {
      if (pivot) gsap.killTweensOf(pivot.position)
    }
  }, [])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // Without this, a click that also lands on something farther along the
    // same ray (the knob, the TV body) would fire that handler too — see
    // the knob-vs-tray mixup this was added to fix.
    event.stopPropagation()
    if (!trayPivotRef.current) return
    const next = !isOpen
    setIsOpen(next)
    gsap.to(trayPivotRef.current.position, {
      z: next ? TRAY_OPEN_Z : TRAY_CLOSED_Z,
      duration: DVD_TRAY_ANIM_DURATION,
      ease: 'power2.out',
    })
  }

  return (
    <group name="dvd-player" position={DVD_PLAYER_POSITION}>
      {/* No click handler here on purpose — this is the whole chassis
          footprint (wide + deep enough to reach under most of the TV), so
          making it clickable meant almost any stray ray near the knob
          also hit this and toggled the tray. The actual click target is
          the tray/lip mesh below — same size and position as a real
          eject-door area, not the whole case. */}
      <group name="dvd-player-body" position={[0, DVD_PLAYER_HEIGHT / 2, 0]}>
        <RoundedBox
          args={[DVD_PLAYER_WIDTH, DVD_PLAYER_HEIGHT, DVD_PLAYER_DEPTH]}
          radius={0.008}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#4a4a4a" roughness={0.4} metalness={0.3} />
        </RoundedBox>
      </group>

      {/* Pivot for the disc tray — position.z is the tween target above.
          The raised front lip lives IN here (not on dvd-player-body)
          because it's the tray/drawer's own face — it has to slide out
          together with the tray, not stay fixed to the chassis. */}
      <group
        name="dvd-player-tray-pivot"
        ref={trayPivotRef}
        position={[0.15, DVD_PLAYER_HEIGHT * 0.3, TRAY_CLOSED_Z]}
      >
        <mesh
          castShadow
          position={[0, 0, TRAY_BOX_Z]}
          onClick={handleClick}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <boxGeometry args={[TRAY_BOX_WIDTH, TRAY_BOX_HEIGHT, TRAY_BOX_DEPTH]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>

        {/* Sits on the tray box's top surface, flush with its front face —
            same "stack + flush" trick as the chassis, just parented here.
            Also clickable — it's the visible "door" of the drawer, same
            click target as the tray box behind it. */}
        <RoundedBox
          args={[TRAY_BOX_WIDTH, DVD_PLAYER_LIP_HEIGHT, DVD_PLAYER_LIP_DEPTH]}
          radius={0.006}
          smoothness={4}
          position={[
            0,
            TRAY_BOX_HEIGHT / 2 + DVD_PLAYER_LIP_HEIGHT / 2,
            TRAY_BOX_Z + TRAY_BOX_DEPTH / 2 - DVD_PLAYER_LIP_DEPTH / 2,
          ]}
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.3} />
        </RoundedBox>
      </group>
    </group>
  )
}
