import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import gsap from 'gsap'
import type { Group } from 'three'
import { TV_DEPTH, TV_HEIGHT, TV_POSITION, TV_WIDTH } from '@/cores/const/scene'
import { KNOB_DETENT_ANGLE, KNOB_DRAG_SENSITIVITY, KNOB_SNAP_DURATION } from '@/cores/const/interaction'

// 機身／螢幕／旋鈕分開成獨立物件（不是融成一顆 mesh），因為旋鈕需要自己的
// 旋轉軸心，螢幕之後貼圖系統上線也需要自己的材質——見 CLAUDE.md 的 Phase 計畫。
export function RetroTV() {
  const knobPivotRef = useRef<Group>(null)

  // OrbitControls 是直接掛在 canvas DOM 元素上的（在 R3F 自己的合成事件系統之外），
  // 所以拖曳旋鈕的同時鏡頭也會一起轉，除非拖曳期間主動把它關掉。這裡的 `controls`
  // 就是 Experience.tsx 裡 <OrbitControls> 靠 `makeDefault` 註冊上去的那個實例。
  // 先轉成 `unknown` 再轉目標型別——R3F 的 store 只保證這是某種
  // EventDispatcher，跟 `{ enabled: boolean }` 結構上完全不重疊，直接 `as`
  // 過去在某些 TypeScript 版本會被判定為「型別不夠重疊」而報錯（TS2352），
  // 先繞道 `unknown` 是官方建議的寫法，不受版本行為影響。
  const controls = useThree((state) => state.controls) as unknown as { enabled: boolean } | null

  // 目前還沒有任何地方在用——等 Phase 2（螢幕貼圖系統）上線後，會讀這個值決定
  // 要顯示哪個頻道/項目的預覽。拖曳機制跟「切換內容」的串接刻意分成兩步做，
  // 跟 DVD player 的 tray 一樣，先做完機構動作，之後才接資料。
  const [, setChannelIndex] = useState(0)

  useEffect(() => {
    const pivot = knobPivotRef.current
    return () => {
      if (pivot) gsap.killTweensOf(pivot.rotation)
      // 防呆：如果拖曳「途中」這個元件被整個拆掉（例如之後做場景切換），
      // 不要留下一顆永遠被鎖死、之後接手的東西再也轉不動的鏡頭。
      if (controls) controls.enabled = true
    }
  }, [controls])

  // `useDrag` 的回傳型別是個條件型別（config 有沒有帶 target 決定回傳
  // void 還是可呼叫的 bind function），我們沒有傳 config，這個條件在不同
  // TypeScript 版本的泛型推斷下可能解讀不一樣，導致 `bindKnobDrag()` 被
  // 誤判成不能呼叫（TS2349）。明確標出真正的型別，繞過這個推斷歧義。
  const bindKnobDrag = useDrag(({ first, last, delta: [dx], event }) => {
    const pivot = knobPivotRef.current
    if (!pivot) return

    // 不喊停的話，打中旋鈕的這條射線還是會繼續往後面傳，打到後面的東西
    // （TV 機身、DVD player）也把它們的 handler 一起觸發——對應 DVDPlayer
    // 那邊 handleClick 做的另一半修正。
    event.stopPropagation()

    if (first) {
      // 上一輪放開後的 tween 可能還在往檔位滑，重新抓住旋鈕時要立刻接管，
      // 不要跟它打架。
      gsap.killTweensOf(pivot.rotation)
      // `controls` 是 useThree 拿到的、真實存在的 three.js OrbitControls 實例，
      // 不是 React state——直接改 .enabled 就是它預期的用法，跟下面直接改
      // pivot.rotation.z 是同一種「命令式操作 three.js 物件」的邏輯。
      // oxlint-disable-next-line react/immutability
      if (controls) controls.enabled = false
    }

    pivot.rotation.z -= dx * KNOB_DRAG_SENSITIVITY

    if (last) {
      if (controls) controls.enabled = true
      const steps = Math.round(pivot.rotation.z / KNOB_DETENT_ANGLE)
      const snapped = steps * KNOB_DETENT_ANGLE
      gsap.to(pivot.rotation, { z: snapped, duration: KNOB_SNAP_DURATION, ease: 'back.out(2)' })
      setChannelIndex(steps)
    }
  }) as unknown as (...args: unknown[]) => Record<string, unknown>

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

      {/* 螢幕先用一片平面佔位，Phase 2 才會換成真的貼圖/canvas 材質 */}
      <mesh name="tv-screen" position={[0, TV_HEIGHT * 0.56, TV_DEPTH / 2 + 0.002]}>
        <planeGeometry args={[TV_WIDTH * 0.62, TV_HEIGHT * 0.5]} />
        <meshStandardMaterial color="#0a1a0a" emissive="#39ff14" emissiveIntensity={0.08} />
      </mesh>

      {/* 頻道旋鈕的軸心——拖曳/snap 動的是這個 group 的 rotation.z。
          轉的是這個 group 本身（不是旋鈕 mesh 自己的 rotation），因為這個
          group 相對世界座標沒有額外旋轉，旋鈕 mesh 那個固定的 x 軸旋轉只是
          把圓柱「橫躺」讓它的軸心本來就對齊世界 Z 軸而已。 */}
      <group
        name="tv-knob-pivot"
        ref={knobPivotRef}
        position={[TV_WIDTH * 0.32, TV_HEIGHT * 0.18, TV_DEPTH / 2 + 0.015]}
      >
        <mesh
          castShadow
          rotation={[Math.PI / 2, 0, 0]}
          {...bindKnobDrag()}
          onPointerOver={() => { document.body.style.cursor = 'grab' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <cylinderGeometry args={[0.035, 0.035, 0.03, 20]} />
          <meshStandardMaterial color="#3a2e1e" roughness={0.5} />
        </mesh>

        {/* 指示刻度——旋鈕本身是個旋轉對稱的圓柱體，沒有這個標記的話，
            轉了也完全看不出差異。 */}
        <mesh position={[0.022, 0, 0.017]} castShadow>
          <boxGeometry args={[0.01, 0.004, 0.004]} />
          <meshStandardMaterial color="#e8e8d0" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
