import {
  DVD_CASE_BASE_POSITION,
  DVD_CASE_DEPTH,
  DVD_CASE_HEIGHT,
  DVD_CASE_LEAN_ANGLE,
  DVD_CASE_WIDTH,
} from '@/cores/const/scene'

// Leaning against something means the BASE stays planted and the TOP
// swings toward the surface — like a book leaned against a wall. So the
// lean rotation's pivot has to be the case's bottom edge, not its
// geometric center (rotating around the center swings the near corner
// into the TV instead of just tipping the top over).
//
// dvd-case-lean-pivot sits at the base, at ground level. The inner
// dvd-case group is offset up by half the case height so the case
// visually "stands" on that base point — same trick as tv-body/
// dvd-player-body, just for a rotated pivot instead of a level one.
export function DVDCase() {
  return (
    <group
      name="dvd-case-lean-pivot"
      position={DVD_CASE_BASE_POSITION}
      rotation={[0, 0, DVD_CASE_LEAN_ANGLE]}
    >
      <group name="dvd-case" position={[0, DVD_CASE_HEIGHT / 2, 0]}>
        <mesh name="dvd-case-back-cover" position={[0, 0, -DVD_CASE_DEPTH / 4]} castShadow receiveShadow>
          <boxGeometry args={[DVD_CASE_WIDTH, DVD_CASE_HEIGHT, DVD_CASE_DEPTH / 2]} />
          <meshStandardMaterial color="#3a3a4e" roughness={0.3} />
        </mesh>

        <group
          name="dvd-case-front-cover-pivot"
          position={[-DVD_CASE_WIDTH / 2, 0, DVD_CASE_DEPTH / 4]}
        >
          <mesh
            name="dvd-case-front-cover"
            position={[DVD_CASE_WIDTH / 2, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[DVD_CASE_WIDTH, DVD_CASE_HEIGHT, DVD_CASE_DEPTH / 2]} />
            <meshStandardMaterial color="#4a4a60" roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
