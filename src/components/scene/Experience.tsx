import { OrbitControls } from '@react-three/drei'
import { RetroTV } from '@/components/tv/RetroTV'
import { DVDPlayer } from '@/components/dvd/DVDPlayer'
import { DVDCase } from '@/components/dvd/DVDCase'
import { CAMERA_TARGET, ORBIT_MAX_DISTANCE, ORBIT_MIN_DISTANCE } from '@/cores/const/scene'

export function Experience() {
  return (
    <>
      <color attach="background" args={['#0a0a0a']} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[0.6, 1.2, 0.8]} intensity={1.2} castShadow />
      <pointLight position={[-0.6, 0.5, -0.4]} intensity={0.15} color="#39ff14" />

      <DVDPlayer />
      <RetroTV />
      <DVDCase />

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      <OrbitControls
        enablePan={false}
        target={CAMERA_TARGET}
        minDistance={ORBIT_MIN_DISTANCE}
        maxDistance={ORBIT_MAX_DISTANCE}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}
