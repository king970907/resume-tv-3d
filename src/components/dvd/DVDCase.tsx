import {
  DVD_CASE_DEPTH,
  DVD_CASE_HEIGHT,
  DVD_CASE_LEAN_ANGLE,
  DVD_CASE_POSITION,
  DVD_CASE_WIDTH,
} from '@/cores/const/scene'

// The front cover's pivot group sits at the spine (left edge of the case),
// and the cover mesh is offset +width/2 inside it — so rotating the pivot
// around Y swings the cover open like a book, instead of spinning around
// its own center. Same "pivot at the edge, not the centroid" trick the
// tray and knob use.
export function DVDCase() {
  return (
    <group name="dvd-case" position={DVD_CASE_POSITION} rotation={[0, 0, DVD_CASE_LEAN_ANGLE]}>
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
  )
}
