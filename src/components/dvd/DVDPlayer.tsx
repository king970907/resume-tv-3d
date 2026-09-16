import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Mesh, MeshStandardMaterial, Object3D } from 'three'
import { DVD_PLAYER_POSITION } from '@/cores/const/scene'
import { DVD_LED_PULSE_DURATION, DVD_TRAY_ANIM_DURATION, DVD_TRAY_OPEN_DISTANCE } from '@/cores/const/interaction'

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

// 播放/退片按鈕（Housing+Divider）的發光狀態——沒放片時暗掉，放片後還沒
// 按播放時琥珀色呼吸燈提示「可以按了」，播放中穩定發綠光。原本這組燈號
// 是做在 DVD_Screen（LED顯示幕，一大片矩形）上，使用者反應那片螢幕的
// 呼吸/變色效果太搶眼、乾脆整個拿掉，只保留按鈕本身的提示。顏色沿用
// 場景既有的強調色（PROJECT_ACCENT_COLORS/DVDSelector 選片燈都用過同一
// 組色票），不額外生新色票。
const LED_OFF_COLOR = '#33241a'
const LED_OFF_INTENSITY = 0
const LED_READY_COLOR = '#ffb066'
const LED_READY_INTENSITY = 1.2
const LED_PLAYING_COLOR = '#39ff14'
const LED_PLAYING_INTENSITY = 1.4

interface DVDPlayerProps {
  // 受控元件——跟 DVDCase 同一套設計：開闔狀態交給 Experience.tsx 統一
  // 管理，因為選片放片流程需要從外面（點選好的碟片之後）主動把 tray
  // 打開又關上，不能只靠使用者自己點 tray 才會動。
  isOpen: boolean
  onToggle: () => void
  // 把 tray 的 Object3D 實例回報給外面——DVDSelector 放片動畫最後一段
  // 要把碟片 attach 到這個物件底下（見 DVDSelector.tsx 的說明），讓碟片
  // 之後能跟著 tray 關閉的動畫一起移動，不用自己另外算一次位置。
  onTrayReady?: (tray: Object3D | null) => void
  // 目前 player 裡有沒有放片——只決定 LED 燈號亮不亮，跟 tray 開闔動畫
  // 是兩件獨立的事（碟片放進去之後 tray 會自己關上，燈號要持續亮著）。
  hasDisc: boolean
  // 是不是正在播放作品集內容——決定 LED 是「就緒」還是「播放中」的顏色。
  isPlaying: boolean
  // 點擊左側 PowerEject 按鈕——播放/暫停切換，實際的播放狀態邏輯在
  // MainScene，這裡只負責把點擊事件往上送。
  onPlayPauseToggle: () => void
}

export function DVDPlayer({ isOpen, onToggle, onTrayReady, hasDisc, isPlaying, onPlayPauseToggle }: DVDPlayerProps) {
  const { nodes } = useGLTF('/models/dvd-player.glb') as unknown as { nodes: GLTFNodes }
  const trayRef = useRef<Object3D>(null)
  const closedZRef = useRef(0)
  const powerEjectHousingRef = useRef<Object3D>(null)
  const powerEjectDividerRef = useRef<Object3D>(null)
  // 按鈕（Housing+Divider）的材質——放片狀態的燈號提示全部集中在這兩個
  // mesh 上（不再有獨立的 LED 螢幕，見上面 LED_* 常數的說明）。
  const buttonMaterialsRef = useRef<MeshStandardMaterial[]>([])

  // 發光材質初始化——只做一次，跟 RetroTV.tsx 抓 TV_Screen_Glass 同一套
  // 做法：clone 一份、不動 GLTF 快取的原始材質，避免 HMR 重新載入模型時
  // emissive 設定疊加在同一個物件上累積出奇怪的狀態。初始狀態是暗的，
  // 下面另一個 effect 依 hasDisc/isPlaying 決定要不要點亮/閃爍。
  useEffect(() => {
    const cloneEmissiveMaterial = (object: Object3D | null): MeshStandardMaterial | null => {
      const mesh = object as unknown as Mesh | null
      if (!mesh) return null
      const material = (mesh.material as MeshStandardMaterial).clone()
      material.emissive.set(LED_OFF_COLOR)
      material.emissiveIntensity = LED_OFF_INTENSITY
      mesh.material = material
      return material
    }

    const housingMaterial = cloneEmissiveMaterial(powerEjectHousingRef.current)
    const dividerMaterial = cloneEmissiveMaterial(powerEjectDividerRef.current)
    buttonMaterialsRef.current = [housingMaterial, dividerMaterial].filter((m): m is MeshStandardMaterial => m !== null)

    return () => {
      housingMaterial?.dispose()
      dividerMaterial?.dispose()
    }
  }, [])

  // 按鈕燈號狀態切換——沒放片/已就緒（呼吸燈）/播放中三種狀態，見上面
  // 三組 LED_* 常數的說明。每次狀態改變都先 kill 掉前一個 tween，不然
  // 「已就緒」的呼吸燈（repeat:-1 無限循環）會跟新狀態的 tween 疊在一起
  // 互搶數值。
  useEffect(() => {
    const buttonMaterials = buttonMaterialsRef.current
    if (buttonMaterials.length === 0) return
    buttonMaterials.forEach((material) => gsap.killTweensOf(material))

    if (!hasDisc) {
      buttonMaterials.forEach((material) => {
        material.emissive.set(LED_OFF_COLOR)
        gsap.to(material, { emissiveIntensity: LED_OFF_INTENSITY, duration: DVD_TRAY_ANIM_DURATION, ease: 'power2.out' })
      })
      return
    }

    if (isPlaying) {
      buttonMaterials.forEach((material) => {
        material.emissive.set(LED_PLAYING_COLOR)
        gsap.to(material, { emissiveIntensity: LED_PLAYING_INTENSITY, duration: DVD_TRAY_ANIM_DURATION, ease: 'power2.out' })
      })
      return
    }

    // 已就緒、還沒按播放——呼吸燈：在 0 跟 LED_READY_INTENSITY 之間來回，
    // 用 yoyo+repeat:-1 讓它無限循環，直到使用者按下播放鍵或狀態改變。
    buttonMaterials.forEach((material) => {
      material.emissive.set(LED_READY_COLOR)
      gsap.to(material, {
        emissiveIntensity: LED_READY_INTENSITY,
        duration: DVD_LED_PULSE_DURATION / 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    })
  }, [hasDisc, isPlaying])

  useEffect(() => {
    const tray = trayRef.current
    if (tray) closedZRef.current = tray.position.z
    onTrayReady?.(tray)
    return () => onTrayReady?.(null)
    // onTrayReady 是呼叫端每次 render 現傳的箭頭函式，不是穩定參照——放進
    // deps 只會讓這個 effect 每次 render 都重跑，沒有意義（tray 這個
    // Object3D 實例本身在元件生命週期內不會變）。
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const tray = trayRef.current
    if (!tray) return
    gsap.killTweensOf(tray.position)
    const closedZ = closedZRef.current
    gsap.to(tray.position, {
      [TRAY_SLIDE_AXIS]: isOpen ? closedZ - DVD_TRAY_OPEN_DISTANCE : closedZ,
      duration: DVD_TRAY_ANIM_DURATION,
      ease: 'power2.out',
    })
  }, [isOpen])

  useEffect(() => {
    const tray = trayRef.current
    return () => {
      if (tray) gsap.killTweensOf(tray.position)
      buttonMaterialsRef.current.forEach((buttonMaterial) => gsap.killTweensOf(buttonMaterial))
    }
  }, [])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 不喊停的話，這條射線還是會繼續往後面傳，打到後面的 TV 機身也把它的
    // handler 一起觸發——跟 RetroTV 旋鈕那邊的修正是同一個理由。
    event.stopPropagation()
    onToggle()
  }

  const handlePlayPauseClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onPlayPauseToggle()
  }

  const powerEjectEventHandlers = {
    onClick: handlePlayPauseClick,
    onPointerOver: () => { document.body.style.cursor = 'pointer' },
    onPointerOut: () => { document.body.style.cursor = 'default' },
  }

  return (
    <group name="dvd-player" position={DVD_PLAYER_POSITION} rotation={[0, Math.PI, 0]}>
      {/* 機身/面板/接口等所有靜態部件——Tray/播放鍵/LED 雖然也在這個節點樹
          裡，但下面單獨用 primitive 把它們抓出來接事件/材質，three.js 的
          Object3D.add() 會自動把它們從這裡的階層搬過去，不會重複渲染
          兩次。 */}
      <primitive object={nodes.DVDPlayer} />

      <primitive
        object={nodes.DVD_Tray}
        ref={trayRef}
        onClick={handleClick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      />

      {/* 左側電源/退片鍵區——兩個各自獨立的 mesh，不像 DVD_Tray 有共同的
          Empty 父層可以只掛一次靠事件冒泡，兩個都要掛（見 notes.md）。
          語意是播放/暫停：按第一次開始播放作品集內容，再按一次退回履歷，
          光碟本身留在 tray 裡不做退出動畫。 */}
      <primitive object={nodes.DVD_PowerEjectHousing} ref={powerEjectHousingRef} {...powerEjectEventHandlers} />
      <primitive object={nodes.DVD_PowerEjectDivider} ref={powerEjectDividerRef} {...powerEjectEventHandlers} />
    </group>
  )
}

useGLTF.preload('/models/dvd-player.glb')
