import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Group } from 'three'
import { TV_DEPTH, TV_HEIGHT, TV_POSITION, TV_WIDTH } from '@/cores/const/scene'
import { KNOB_DEFAULT_PAGE_COUNT, KNOB_STEP_DURATION } from '@/cores/const/interaction'

interface RetroTVProps {
  // 目前的頁數——預設 0（還沒有真正的內容，見 KNOB_DEFAULT_PAGE_COUNT）。
  // 之後接上個人頁面資料，或插入 DVD 後 Step 3 傳作品數量進來，才會變成
  // 有意義的正整數。每格角度永遠是 360° / pageCount，公式不用改，換數字就好。
  pageCount?: number
}

// 機身／螢幕／旋鈕分開成獨立物件（不是融成一顆 mesh），因為旋鈕需要自己的
// 旋轉軸心，螢幕之後貼圖系統上線也需要自己的材質——見 CLAUDE.md 的 Phase 計畫。
export function RetroTV({ pageCount = KNOB_DEFAULT_PAGE_COUNT }: RetroTVProps) {
  const knobPivotRef = useRef<Group>(null)
  // 累計「按過幾次」，永遠只增加、不取餘數——這是拿來算動畫目標角度用的，
  // 跟下面的邏輯頁碼（會用餘數繞回 0~pageCount-1）分開存。角度如果也取
  // 餘數，繞回第 0 頁時目標角度會突然變回 0，GSAP 會照數字差距直接補間，
  // 變成往回轉一大圈，而不是照原本方向繼續多轉一格。
  const stepCountRef = useRef(0)

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

    // 頁數是 0 代表還沒有真正的內容可以切（資料層還沒接上）——旋鈕維持
    // 可以點、有 hover 游標，但點了不會動，不要除以 0 也不要假裝有內容。
    if (pageCount <= 0) return

    const pivot = knobPivotRef.current
    if (!pivot) return

    gsap.killTweensOf(pivot.rotation)

    // 用 ref 存目前累計次數（不是直接讀 state），避免快速連續點擊時吃到還
    // 沒更新完的舊值——setState 是非同步的，這裡需要的是「當下真正的次數」。
    stepCountRef.current += 1
    const pageIndex = stepCountRef.current % pageCount
    setChannelIndex(pageIndex)

    // 目標角度用累計次數算，不是用 pageIndex（繞回 0 之後的餘數）算——
    // 這樣不管繞了幾圈，每次點擊的動畫永遠是「照原本方向多轉一格」。
    const stepAngle = (Math.PI * 2) / pageCount
    gsap.to(pivot.rotation, {
      z: -stepCountRef.current * stepAngle,
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
            轉了也完全看不出差異。位置放在 +Y（正上方），這樣 rotation.z
            預設是 0 的時候，刻度剛好指向正上方，視覺上讀作「0 度」。 */}
        <mesh position={[0, 0.022, 0.017]} castShadow>
          <boxGeometry args={[0.01, 0.004, 0.004]} />
          <meshStandardMaterial color="#e8e8d0" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
