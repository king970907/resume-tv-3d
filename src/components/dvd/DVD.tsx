import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { BufferGeometry, Group, Material } from 'three'
import type { Project } from '@/cores/types/project'

interface DVDProps {
  project: Project
  position?: [number, number, number]
  // 這個元件約定的預設朝向是「面朝鏡頭（+Z）」，跟旋鈕不同，父層不需要
  // 額外轉 90° 拗過去。
  rotation?: [number, number, number]
  onSelect?: (project: Project) => void
  onHoverChange?: (hovering: boolean) => void
}

// 真實模型從 Blender 匯出（blender-project/models/dvd-disc/dvd-disc.blend
// → public/models/dvd-disc.glb）。彩虹資料面材質本來是 Fresnel 驅動的
// 視角相依效果（越斜看越鮮豔），glTF 不支援這種節點也不支援視角相依，已經
// 在 Blender 端烤成固定的貼圖快照——烤出來的顏色會比 Blender 視角裡看到的
// 更平淡一點（少了視角變化的加成），有需要的話再回 Blender 調飽和度重烤。
type GLTFNodes = Record<string, Group>

// 這個元件會同時被實例化好幾份（選片畫面每個 project 各一份、盒子裡的裝飾
// 片再一份）——不能用 <primitive object={nodes.DVD_Disc}> 直接塞進場景，
// 同一個 three.js 物件實例不能同時掛在場景圖的多個地方（後掛的會把前面的
// 擠掉，只會顯示最後一份）。改成只取 geometry/material 餵給 <mesh>，這兩個
// 可以安全在多個 mesh 之間共用，是 R3F 處理「同一份 glTF 資源要重複實例化」
// 的標準做法。
//
// nodes.DVD_Disc 本身不是單一個 Mesh，是一個 Group，底下包 4 個子 Mesh
// （光碟在 Blender 端有4個材質slot：夾持環/資料面/外緣/標籤面，glTF匯出
// 時每個材質slot會拆成獨立的 primitive，GLTFLoader 載入後對應成獨立的
// Mesh，不是合併成一個多材質陣列的 Mesh）——一開始以為是單一 Mesh 直接
// 讀 disc.geometry/disc.material，兩個都是 undefined，R3F 因此塞進去空的
// 預設幾何體，光碟整個不見。要對這個 Group 的每個子 Mesh 各自取
// geometry/material 分開渲染。
export function DVD({ project, position = [0, 0, 0], rotation = [0, 0, 0], onSelect, onHoverChange }: DVDProps) {
  const { nodes } = useGLTF('/models/dvd-disc.glb') as unknown as { nodes: GLTFNodes }
  const discParts = nodes.DVD_Disc.children as unknown as { geometry: BufferGeometry; material: Material }[]

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
      {/* Blender 端光碟本地座標的標籤面是 -Z（跟 dvd-case 那邊裝配時的
          方向一致，見 blender-project/models/dvd-case/notes.md），這個
          元件的約定是預設要面朝 +Z，所以整組繞 X 轉 180° 翻面。 */}
      <group rotation={[Math.PI, 0, 0]}>
        {discParts.map((part, i) => (
          <mesh key={i} geometry={part.geometry} material={part.material} castShadow receiveShadow />
        ))}
      </group>
    </group>
  )
}

useGLTF.preload('/models/dvd-disc.glb')
