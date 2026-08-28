import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'

// Placeholder blockout for the TV body — stands in for the real RetroTV
// mesh until Phase 1. Rotates via useFrame to prove the render loop works.
function TVBlockout() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 0.4
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[2, 1.3, 1]} />
      <meshStandardMaterial color="#d4c5a0" roughness={0.6} metalness={0.1} />
    </mesh>
  )
}

export function Experience() {
  return (
    <>
      <color attach="background" args={['#0a0a0a']} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} castShadow />
      <pointLight position={[-3, 2, -2]} intensity={0.3} color="#39ff14" />

      <TVBlockout />

      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}
