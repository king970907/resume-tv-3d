import type { ThreeEvent } from '@react-three/fiber'
import type { Project } from '@/cores/types/project'
import { DVD_DIAMETER, DVD_THICKNESS } from '@/cores/const/scene'

interface DVDProps {
  project: Project
  position?: [number, number, number]
  // 圓柱體預設軸心沿 Y（像旋鈕原本那樣站著）。預設值把它轉成圓面朝向
  // 鏡頭（+Z），跟旋鈕同一招（繞 X 軸轉 90°）。開放這個 prop 是為了讓不同
  // 擺放位置（例如之後 tray 上的碟片）可以各自覆寫方向，不是每個用法都
  // 一定要正面朝鏡頭。
  rotation?: [number, number, number]
  onSelect?: (project: Project) => void
}

export function DVD({ project, position = [0, 0, 0], rotation = [Math.PI / 2, 0, 0], onSelect }: DVDProps) {
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 盒子本身、其他碟片都可能疊在附近，喊停避免一次點擊選到不只一片。
    event.stopPropagation()
    onSelect?.(project)
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = 'default' }}
    >
      <cylinderGeometry args={[DVD_DIAMETER / 2, DVD_DIAMETER / 2, DVD_THICKNESS, 32]} />
      <meshStandardMaterial color="#c8c8d0" metalness={0.6} roughness={0.25} />
    </mesh>
  )
}
