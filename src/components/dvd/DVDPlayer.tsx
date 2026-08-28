import { RoundedBox } from '@react-three/drei'
import { DVD_PLAYER_DEPTH, DVD_PLAYER_HEIGHT, DVD_PLAYER_POSITION, DVD_PLAYER_WIDTH } from '@/cores/const/scene'

// Tray is a separate object sitting at the front face — later it slides
// along +Z on click, so it needs its own pivot rather than being fused
// into the body geometry.
export function DVDPlayer() {
  return (
    <group name="dvd-player" position={DVD_PLAYER_POSITION}>
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

      {/* Pivot for the disc tray — will translate along +Z once open/close lands */}
      <group
        name="dvd-player-tray-pivot"
        position={[0, DVD_PLAYER_HEIGHT * 0.55, DVD_PLAYER_DEPTH / 2]}
      >
        <mesh castShadow position={[0, 0, 0.005]}>
          <boxGeometry args={[DVD_PLAYER_WIDTH * 0.7, DVD_PLAYER_HEIGHT * 0.35, 0.01]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
