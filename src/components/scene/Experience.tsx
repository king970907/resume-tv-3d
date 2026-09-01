import { OrbitControls } from '@react-three/drei'
import { RetroTV } from '@/components/tv/RetroTV'
import { DVDPlayer } from '@/components/dvd/DVDPlayer'
import { DVDCase } from '@/components/dvd/DVDCase'
import { CAMERA_TARGET, ORBIT_MAX_DISTANCE, ORBIT_MIN_DISTANCE } from '@/cores/const/scene'

export function Experience() {
  return (
    <>
      <color attach="background" args={['#0a0a0a']} />

      {/* Overall fill — raised so nothing falls fully black in shadow */}
      <ambientLight intensity={0.7} />

      {/* Key light — main directional light from above-front, casts the shadows */}
      <directionalLight position={[0.6, 1.2, 0.8]} intensity={1.2} castShadow />

      {/* Fill light — low and from the front, specifically to catch the
          DVD player's face since it sits in the TV's shadow from the key light */}
      <directionalLight position={[0, 0.35, 1.2]} intensity={0.5} />

      {/* Accent — point lights use candela units in this three.js version,
          so this needs to be much higher than a directional/ambient
          intensity to read as anything at all */}
      <pointLight position={[-0.6, 0.5, -0.4]} intensity={4} color="#39ff14" />

      <DVDPlayer />
      <RetroTV />
      <DVDCase />

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* makeDefault registers this instance on the R3F store (useThree
          -> state.controls), so any mesh's drag handler elsewhere in the
          tree (the TV knob) can grab it and toggle .enabled — needed
          because OrbitControls listens on the canvas DOM element directly,
          outside R3F's own event system, so stopPropagation on a mesh's
          pointer event can't stop it from also reacting to the same drag. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        target={CAMERA_TARGET}
        minDistance={ORBIT_MIN_DISTANCE}
        maxDistance={ORBIT_MAX_DISTANCE}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}
