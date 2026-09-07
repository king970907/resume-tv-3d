import type { ThreeEvent } from '@react-three/fiber'
import type { Project } from '@/cores/types/project'
import { DVD_DIAMETER, DVD_THICKNESS } from '@/cores/const/scene'

const OUTER_RADIUS = DVD_DIAMETER / 2
const INNER_RADIUS = OUTER_RADIUS * 0.125 // 真實 DVD 軸孔跟片徑的比例大約是這樣
const RING_SEGMENTS = 48

interface DVDProps {
  project: Project
  position?: [number, number, number]
  // 三片 mesh（正面標籤、反面資料面、外緣）疊出來的組合預設就是面朝
  // 鏡頭（+Z），跟旋鈕不同，這裡不需要額外轉 90° 拗過去。
  rotation?: [number, number, number]
  onSelect?: (project: Project) => void
  onHoverChange?: (hovering: boolean) => void
}

// 用三個陽春 geometry 疊出「有洞的薄片」，不用 ExtrudeGeometry 是因為它的
// 正反面材質分組不直覺；RingGeometry（正反面）+ 開口的 CylinderGeometry
// （外緣厚度）三片組合，每片都很單純，跟專案裡其他部件的做法一致。
export function DVD({ project, position = [0, 0, 0], rotation = [0, 0, 0], onSelect, onHoverChange }: DVDProps) {
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 盒子本身、其他碟片都可能疊在附近，喊停避免一次點擊選到不只一片。
    event.stopPropagation()
    onSelect?.(project)
  }

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
        onHoverChange?.(true)
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
        onHoverChange?.(false)
      }}
    >
      {/* 正面（標籤面）——RingGeometry 預設就平躺在 XY 平面、法線朝 +Z，
          不用額外轉向。 */}
      <mesh position={[0, 0, DVD_THICKNESS / 2]} castShadow receiveShadow>
        <ringGeometry args={[INNER_RADIUS, OUTER_RADIUS, RING_SEGMENTS]} />
        <meshStandardMaterial color="#d8d0b8" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* 反面（資料讀取面）——法線要朝 -Z 才會從背面看得到，轉 180°。 */}
      <mesh position={[0, 0, -DVD_THICKNESS / 2]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
        <ringGeometry args={[INNER_RADIUS, OUTER_RADIUS, RING_SEGMENTS]} />
        <meshStandardMaterial color="#c8c8d0" metalness={0.8} roughness={0.15} />
      </mesh>

      {/* 外緣厚度——開口的圓柱側面（沒有上下蓋），圓柱預設軸心沿 Y，轉 90°
          繞 X 軸才會對齊 Z（正反面法線的方向）。 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[OUTER_RADIUS, OUTER_RADIUS, DVD_THICKNESS, RING_SEGMENTS, 1, true]} />
        <meshStandardMaterial color="#9a9aa0" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}
