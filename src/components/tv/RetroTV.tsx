import { useEffect, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { BufferAttribute, CanvasTexture } from 'three'
import type { Mesh, MeshStandardMaterial, Object3D } from 'three'
import { TV_POSITION } from '@/cores/const/scene'
import { KNOB_DEFAULT_PAGE_COUNT, KNOB_STEP_DURATION } from '@/cores/const/interaction'
import { SCREEN_NOISE_REDRAW_INTERVAL_MS } from '@/cores/const/screen'
import { SCREEN_CANVAS_HEIGHT, SCREEN_CANVAS_WIDTH, drawNoise, drawOff, drawPage } from './screenCanvas'
import type { ScreenPage } from '@/data/screenPages'

// 螢幕現在要顯示什麼——'off' 是開場文字階段用的純黑，'loading' 是雜訊
// （開場聚焦完成後、旋鈕換頁時都會用到），'page' 才是真正的內容頁。
// 跟 DVDSelector 的 isOpen/discsReady 是同一種設計理由：呼叫端（最終是
// MainScene 的狀態機）決定「現在該顯示什麼」，RetroTV 只負責照著畫，不
// 自己決定要不要 loading。
export type ScreenContent =
  | { mode: 'off' }
  | { mode: 'loading' }
  | { mode: 'page'; page: ScreenPage; pageNumber: number; pageCount: number }

interface RetroTVProps {
  // 目前的頁數——預設 4（見 KNOB_DEFAULT_PAGE_COUNT，先讓旋鈕機構動起來）。
  // 之後接上個人頁面資料，或插入 DVD 後 Step 3 傳作品數量進來，會換成真實
  // 頁數。每格角度永遠是 360° / pageCount，公式不用改，換數字就好。
  pageCount?: number
  screenContent: ScreenContent
  // 開場運鏡、全螢幕運鏡期間要關掉旋鈕/螢幕的點擊——動畫途中使用者亂點
  // 會讓狀態機（MainScene）收到不該出現的事件，跟 DVDCase 選片期間鎖住
  // OrbitControls 是同一個理由，只是這裡鎖的是旋鈕/螢幕本身的互動。
  interactive?: boolean
  onChannelChange?: (index: number) => void
  onScreenClick?: () => void
}

// 真實模型從 Blender 匯出（blender-project/models/tv/tv.blend → public/models/tv.glb）。
// 機身/旋鈕/螢幕在 Blender 端本來就是分開的物件（不是融成一顆mesh）。
type GLTFNodes = Record<string, Object3D>

// 頻道旋鈕在 Blender 端其實是好幾個獨立物件組成的（本體/圈環/邊框/刻度/標示牌），
// 不是單一 mesh，但不是全部都要跟著轉：
// - Channel/Rim/Ring 是真正會轉動的旋鈕本體，Blender 端用車床剖面繞出來的圓柱體，
//   本身帶了 rotation.x=90° 把圓柱「立起來」朝向面板，因此要轉的是本地 Y 軸
//   （在瀏覽器用 matrixWorld 實測驗證過：轉 rotation.y 時，本地 Y 軸的世界朝向
//   本身不會變，代表轉的正是旋鈕自己的面法向量）。每次連到新模型都要重新用
//   同樣方式實測，不能直接套用其他物件量出來的軸。
// - Ticks（刻度盤）跟 Label（標示牌）都不轉：Ticks 是固定的參考刻度，用來
//   對照旋鈕本體轉到哪個位置，跟真實類比旋鈕的設計一樣——轉的是「指針」（這裡
//   是旋鈕本體上的線），不是刻度本身。Label 實測量過離旋鈕圓心的距離(約41mm)
//   比 Rim 的半徑(約29mm)還遠，是旋鈕外側面板上的固定標示牌，跟刻度盤一樣不轉。
//   這兩個維持留在 nodes.TV 的靜態階層裡，不額外抓出來接旋轉。

export function RetroTV({
  pageCount = KNOB_DEFAULT_PAGE_COUNT,
  screenContent,
  interactive = true,
  onChannelChange,
  onScreenClick,
}: RetroTVProps) {
  const { nodes } = useGLTF('/models/tv.glb') as unknown as { nodes: GLTFNodes }

  // 會轉動的旋鈕本體3個子物件各自固定一個 ref（Ticks/Label 不轉，見上面說明，
  // 不需要 ref）。
  const channelRef = useRef<Object3D>(null)
  const rimRef = useRef<Object3D>(null)
  const ringRef = useRef<Object3D>(null)
  const yAxisRefs = [channelRef, rimRef, ringRef]

  // 螢幕玻璃——抓出來單獨接貼圖，跟旋鈕一樣用 primitive+ref 的方式從
  // nodes.TV 的靜態階層裡搬出來（three.js Object3D.add() 自動處理，不會
  // 重複渲染兩次）。
  const screenRef = useRef<Object3D>(null)
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const screenCtxRef = useRef<CanvasRenderingContext2D | null>(null)
  const screenTextureRef = useRef<CanvasTexture | null>(null)
  const noiseAccumMsRef = useRef(0)

  // 累計「按過幾次」，永遠只增加、不取餘數——這是拿來算動畫目標角度用的，
  // 跟下面的邏輯頁碼（會用餘數繞回 0~pageCount-1）分開存。角度如果也取
  // 餘數，繞回第 0 頁時目標角度會突然變回 0，GSAP 會照數字差距直接補間，
  // 變成往回轉一大圈，而不是照原本方向繼續多轉一格。
  const stepCountRef = useRef(0)

  // GSAP 動畫進度用的代理物件——實際旋轉角度套到上面兩組 refs 的對應軸上，
  // 這樣5個物件才能用同一條補間曲線同步轉動，不會各自跑各自的時間軸。
  const spinProxyRef = useRef({ angle: 0 })

  const [, setChannelIndex] = useState(0)

  useEffect(() => {
    // spinProxyRef.current 本身是 useRef 初始化時就固定的同一個物件（不是
    // React 管理的 DOM/Three節點 ref），unmount 前拿它當清掃目標不會有
    // ref 值在 cleanup 執行前被換掉的問題，但先複製成區域變數符合lint規則。
    const proxy = spinProxyRef.current
    return () => {
      gsap.killTweensOf(proxy)
    }
  }, [])

  // 螢幕貼圖初始化——只做一次，canvas/材質/貼圖都是固定資源，內容變化
  // 交給下面另一個 effect 跟 useFrame 處理，不用每次重建。
  useEffect(() => {
    const mesh = screenRef.current as unknown as Mesh | null
    if (!mesh) return

    const canvas = document.createElement('canvas')
    canvas.width = SCREEN_CANVAS_WIDTH
    canvas.height = SCREEN_CANVAS_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    screenCanvasRef.current = canvas
    screenCtxRef.current = ctx

    // TV_Screen_Glass 這個 mesh 原始沒有 UV（Blender 端從沒建過材質貼圖，
    // 見 blender-project/models/tv/notes.md「螢幕內容顯示邏輯留給 three.js
    // 端」），要自己算一份平面 UV 才能把貼圖正確對應到螢幕表面。螢幕幾乎
    // 是扁平薄片（厚度僅 10mm，寬高各 329/294.6mm），用局部座標 X/Y 對
    // 邊界框線性映射就夠準——跟 CLAUDE.md 第9條「矩形形狀用頂點局部座標
    // 算UV」是同一招，只是這次改在 three.js 端算，不是在 Blender 端。
    // U 軸故意用「反過來」的方向（maxX - x，不是 x - minX）：這個 TV 群組
    // 整台繞 Y 轉了180°才讓螢幕面向鏡頭（見下面 group 的 rotation 註解），
    // Y 軸旋轉180°不會影響 Y 方向本身，但會把本地 +X 翻到鏡頭看到的左邊
    // （不是右邊）——直接用 x - minX 算 U 的話，貼圖會左右鏡像。V 軸不用
    // 額外翻轉：three.js 的 Texture 預設 flipY=true，canvas 2D 畫出來的
    // 「第一列（最上面那排像素）」本來就會對應到 v=1（也就是本地 Y 最大、
    // 螢幕最上面的地方），跟畫面「上下」的直覺是一致的，不用再手動反轉一次
    // ——這兩個翻轉方向都是在瀏覽器截圖比對過才確定的，不是憑經驗法則假設
    // （第一版兩個方向都猜錯，貼圖整個上下左右顛倒，跟畫面轉了180°一樣，
    // 比對後才抓出「U 要翻、V 不用翻」這個組合）。
    const geometry = mesh.geometry
    if (!geometry.getAttribute('uv')) {
      geometry.computeBoundingBox()
      const bbox = geometry.boundingBox
      if (bbox) {
        const position = geometry.getAttribute('position')
        const uv = new Float32Array(position.count * 2)
        const width = bbox.max.x - bbox.min.x || 1
        const height = bbox.max.y - bbox.min.y || 1
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i)
          const y = position.getY(i)
          uv[i * 2] = (bbox.max.x - x) / width
          uv[i * 2 + 1] = (y - bbox.min.y) / height
        }
        geometry.setAttribute('uv', new BufferAttribute(uv, 2))
      }
    }

    // 材質整個 clone 一份，不要直接改 GLTF 快取回來的原始材質物件——這台
    // TV 目前只會出現一次，理論上沒有多實例共用的問題，但 clone 一份還是
    // 比較安全，避免 HMR 重新載入模型時貼圖/emissive 設定疊加在同一個
    // 物件上累積出奇怪的狀態。
    const material = (mesh.material as MeshStandardMaterial).clone()
    const texture = new CanvasTexture(canvas)
    material.map = texture
    // 螢幕內容當發光層而不是純反射色——這樣暗室場景裡螢幕本身會亮
    // 起來，看起來像真的有畫面在播放，不是單純貼了一張圖在玻璃上。
    material.emissiveMap = texture
    material.emissive.set('#ffffff')
    material.emissiveIntensity = 0.6
    mesh.material = material
    screenTextureRef.current = texture

    drawOff(ctx)
    texture.needsUpdate = true

    return () => {
      texture.dispose()
      material.dispose()
    }
  }, [])

  // 內容切換——'off'/'page' 畫一次就好；'loading' 的雜訊持續重繪交給下面
  // 的 useFrame，這裡只需要在「剛切進 loading」的當下清一次，不用等
  // useFrame 的節流間隔才畫出第一張。
  useEffect(() => {
    const ctx = screenCtxRef.current
    const texture = screenTextureRef.current
    if (!ctx || !texture) return

    if (screenContent.mode === 'off') {
      drawOff(ctx)
      texture.needsUpdate = true
    } else if (screenContent.mode === 'page') {
      drawPage(ctx, screenContent.page, screenContent.pageNumber, screenContent.pageCount)
      texture.needsUpdate = true
    } else {
      drawNoise(ctx)
      texture.needsUpdate = true
      noiseAccumMsRef.current = 0
    }
  }, [screenContent])

  useFrame((_, delta) => {
    if (screenContent.mode !== 'loading') return
    const ctx = screenCtxRef.current
    const texture = screenTextureRef.current
    if (!ctx || !texture) return
    noiseAccumMsRef.current += delta * 1000
    if (noiseAccumMsRef.current < SCREEN_NOISE_REDRAW_INTERVAL_MS) return
    noiseAccumMsRef.current = 0
    drawNoise(ctx)
    texture.needsUpdate = true
  })

  const handleKnobClick = (event: ThreeEvent<MouseEvent>) => {
    // 不喊停的話，這條射線還是會繼續往後面傳，打到後面的 DVD player 也把
    // 它的 handler 一起觸發——跟 DVDPlayer 那邊 handleClick 的修正對稱。
    event.stopPropagation()

    if (!interactive) return

    // 頁數是 0 代表還沒有真正的內容可以切（資料層還沒接上）——旋鈕維持
    // 可以點、有 hover 游標，但點了不會動，不要除以 0 也不要假裝有內容。
    if (pageCount <= 0) return

    gsap.killTweensOf(spinProxyRef.current)

    // 用 ref 存目前累計次數（不是直接讀 state），避免快速連續點擊時吃到還
    // 沒更新完的舊值——setState 是非同步的，這裡需要的是「當下真正的次數」。
    stepCountRef.current += 1
    const pageIndex = stepCountRef.current % pageCount
    setChannelIndex(pageIndex)
    onChannelChange?.(pageIndex)

    // 目標角度用累計次數算，不是用 pageIndex（繞回 0 之後的餘數）算——
    // 這樣不管繞了幾圈，每次點擊的動畫永遠是「照原本方向多轉一格」。
    // 正號（不是負號）——實測驗證過，這樣點擊順序才是 90°→180°→270°→0°，
    // 不是反方向的 270°→180°→90°→0°。
    const stepAngle = (Math.PI * 2) / pageCount
    const targetAngle = stepCountRef.current * stepAngle

    gsap.to(spinProxyRef.current, {
      angle: targetAngle,
      duration: KNOB_STEP_DURATION,
      ease: 'back.out(1.7)',
      onUpdate: () => {
        const angle = spinProxyRef.current.angle
        for (const ref of yAxisRefs) {
          if (ref.current) ref.current.rotation.y = angle
        }
      },
    })
  }

  const knobEventHandlers = {
    onClick: handleKnobClick,
    onPointerOver: () => { if (interactive) document.body.style.cursor = 'pointer' },
    onPointerOut: () => { document.body.style.cursor = 'default' },
  }

  const handleScreenClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (!interactive) return
    onScreenClick?.()
  }

  return (
    // rotation.y=180°：Blender(Z-up)建模時「正面」朝的方向，換算成這個場景的
    // three.js(Y-up)座標系之後，跟鏡頭預設朝向的方向剛好相反——實測發現鏡頭
    // 預設角度看到的是機身背板(喇叭遮罩+散熱孔)，不是螢幕。轉整個群組180°讓
    // 螢幕面向鏡頭，旋鈕的spin邏輯是各自物件自己的本地旋轉，疊在這層固定的
    // 180°之上不影響（父層旋轉是常數，子物件轉軸的世界方向只是整個跟著轉
    // 180°，spin動畫本身的軸不變）。
    <group name="tv" position={TV_POSITION} rotation={[0, Math.PI, 0]}>
      {/* 機身/背板/銘牌/刻度盤/標示牌等所有靜態部件——會轉動的旋鈕本體3個
          子物件、螢幕玻璃雖然也在這個節點樹裡，但下面單獨用 primitive 把
          它們抓出來接事件/貼圖，three.js 的 Object3D.add() 會自動把它們
          從這裡的階層搬過去，不會重複渲染兩次。 */}
      <primitive object={nodes.TV} />

      <primitive object={nodes.TV_Knob_Channel} ref={channelRef} {...knobEventHandlers} />
      <primitive object={nodes.TV_Knob_Channel_Rim} ref={rimRef} {...knobEventHandlers} />
      <primitive object={nodes.TV_Knob_Channel_Ring} ref={ringRef} {...knobEventHandlers} />
      {/* Ticks（刻度盤）跟 Label（標示牌）都不抓出來——維持留在 nodes.TV 的
          靜態階層裡，本來就不轉，也不用額外處理。 */}

      <primitive
        object={nodes.TV_Screen_Glass}
        ref={screenRef}
        onClick={handleScreenClick}
        onPointerOver={() => { if (interactive) document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      />
    </group>
  )
}

useGLTF.preload('/models/tv.glb')
