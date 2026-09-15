import { useEffect, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Object3D } from 'three'
import { DVD_PLAYER_POSITION } from '@/cores/const/scene'
import { DVD_TRAY_ANIM_DURATION, DVD_TRAY_OPEN_DISTANCE } from '@/cores/const/interaction'

// 真實模型從 Blender 匯出（blender-project/models/dvd-player/dvd-player.blend
// → public/models/dvd-player.glb），做法跟 RetroTV.tsx 同一套：先在 Blender
// 把程序材質（DVD_BackVents 的 Wave 紋理）烤成貼圖再匯出，因為 glTF 不支援
// 程序節點。
type GLTFNodes = Record<string, Object3D>

// Tray 在 Blender 端本來就是一個空物件(Empty)，底下掛著 Base/FrontPanel/
// Lip_L/Lip_R 四個 mesh——不像 TV 旋鈕總成是好幾個各自獨立的物件，這裡
// 整組本來就在同一個 pivot 底下，抓這一個 Empty 出來接 ref 就好，點擊
// 事件會從底下任何一個 mesh 往上冒泡到這一層（R3F 的事件系統跟 DOM 一樣
// 會沿階層往上傳）。
//
// 滑出的軸向：跟 TV 旋鈕的教訓一樣，Blender(Z-up) 換算成這個場景的
// three.js(Y-up) 座標系之後，「往前滑出」對應哪個本地軸不能用猜的——用
// 瀏覽器 console 直接改 tray 的 local position 實測過，往負值滑正好是
// 朝鏡頭方向滑出，正確。
const TRAY_SLIDE_AXIS = 'z' as const

export function DVDPlayer() {
  const { nodes } = useGLTF('/models/dvd-player.glb') as unknown as { nodes: GLTFNodes }
  const trayRef = useRef<Object3D>(null)
  const closedZRef = useRef(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const tray = trayRef.current
    if (tray) closedZRef.current = tray.position.z
  }, [])

  useEffect(() => {
    const tray = trayRef.current
    return () => {
      if (tray) gsap.killTweensOf(tray.position)
    }
  }, [])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 不喊停的話，同一條射線只要還打中後面的其他東西（旋鈕、TV 機身），
    // 那些的 handler 也會一起被觸發。
    event.stopPropagation()
    const tray = trayRef.current
    if (!tray) return
    const next = !isOpen
    setIsOpen(next)
    const closedZ = closedZRef.current
    gsap.to(tray.position, {
      [TRAY_SLIDE_AXIS]: next ? closedZ - DVD_TRAY_OPEN_DISTANCE : closedZ,
      duration: DVD_TRAY_ANIM_DURATION,
      ease: 'power2.out',
    })
  }

  return (
    <group name="dvd-player" position={DVD_PLAYER_POSITION} rotation={[0, Math.PI, 0]}>
      {/* 機身/面板/接口等所有靜態部件——Tray 雖然也在這個節點樹裡，但下面
          單獨用 primitive 把它抓出來接事件，three.js 的 Object3D.add() 會
          自動把它從這裡的階層搬過去，不會重複渲染兩次。 */}
      <primitive object={nodes.DVDPlayer} />

      <primitive
        object={nodes.DVD_Tray}
        ref={trayRef}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      />
    </group>
  )
}

useGLTF.preload('/models/dvd-player.glb')
