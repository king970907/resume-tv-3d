import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Group } from 'three'
import { TV_DEPTH, TV_HEIGHT, TV_POSITION, TV_WIDTH } from '@/cores/const/scene'
import { KNOB_DEFAULT_PAGE_COUNT, KNOB_STEP_DURATION } from '@/cores/const/interaction'

interface RetroTVProps {
  // 目前的頁數——沒插 DVD 時是固定的 4 個個人頁面，插入 DVD 後 Step 3 會
  // 把這裡換成該片的作品數量。每格角度永遠是 360° / pageCount，公式不用改，
  // 只是換一個數字進來。
  pageCount?: number
}

// 機身／螢幕／旋鈕分開成獨立物件（不是融成一顆 mesh），因為旋鈕需要自己的
// 旋轉軸心，螢幕之後貼圖系統上線也需要自己的材質——見 CLAUDE.md 的 Phase 計畫。
export function RetroTV({ pageCount = KNOB_DEFAULT_PAGE_COUNT }: RetroTVProps) {
  const knobPivotRef = useRef<Group>(null)
  const pageIndexRef = useRef(0)

  // 之後 Phase 2（螢幕貼圖系統）會讀這個 state 決定螢幕要顯示哪一頁的預覽。
  // 旋鈕機制跟「切換內容」的串接刻意分成兩步做，跟 DVD player 的 tray 一樣，
  // 先做完機構動作，之後才接資料。
  const [, setChannelIndex] = useState(0)

  useEffect(() => {
    const pivot = knobPivotRef.current
    return () => {
      if (pivot) gsap.killTweensOf(pivot.rotation)
    }
  }, [])

  const handleKnobClick = (event: ThreeEvent<MouseEvent>) => {
    // 不喊停的話，這條射線還是會繼續往後面傳，打到後面的 DVD player 也把
    // 它的 handler 一起觸發——跟 DVDPlayer 那邊 handleClick 的修正對稱。
    event.stopPropagation()

    const pivot = knobPivotRef.current
    if (!pivot) return

    gsap.killTweensOf(pivot.rotation)

    // 用 ref 存目前頁數（不是直接讀 state），避免快速連續點擊時吃到還沒
    // 更新完的舊值——setState 是非同步的，這裡需要的是「當下真正的頁數」。
    const nextIndex = (pageIndexRef.current + 1) % pageCount
    pageIndexRef.current = nextIndex
    setChannelIndex(nextIndex)

    const stepAngle = (Math.PI * 2) / pageCount
    gsap.to(pivot.rotation, {
      z: -nextIndex * stepAngle,
      duration: KNOB_STEP_DURATION,
      ease: 'back.out(1.7)',
    })
  }

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

      {/* 頻道旋鈕的軸心——每次點擊動的是這個 group 的 rotation.z。
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
          onClick={handleKnobClick}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
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
