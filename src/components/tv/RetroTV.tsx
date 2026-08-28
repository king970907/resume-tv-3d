import { RoundedBox } from '@react-three/drei'
import { TV_DEPTH, TV_HEIGHT, TV_POSITION, TV_WIDTH } from '@/cores/const/scene'

// Body / screen / knob are separate objects (not one fused mesh) because
// the knob needs its own rotation pivot and the screen needs its own
// material once texture-swapping lands — see CLAUDE.md Phase plan.
export function RetroTV() {
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

      {/* Pivot for the channel knob — rotation target once drag interaction lands */}
      <group
        name="tv-knob-pivot"
        position={[TV_WIDTH * 0.32, TV_HEIGHT * 0.18, TV_DEPTH / 2 + 0.015]}
      >
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.03, 20]} />
          <meshStandardMaterial color="#3a2e1e" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
