import { useEffect, useRef, useState } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Group } from 'three'
import {
  DVD_PLAYER_DEPTH,
  DVD_PLAYER_HEIGHT,
  DVD_PLAYER_LIP_DEPTH,
  DVD_PLAYER_LIP_HEIGHT,
  DVD_PLAYER_POSITION,
  DVD_PLAYER_WIDTH,
} from '@/cores/const/scene'
import { DVD_TRAY_ANIM_DURATION, DVD_TRAY_OPEN_DISTANCE } from '@/cores/const/interaction'

const TRAY_CLOSED_Z = DVD_PLAYER_DEPTH / 3.5
const TRAY_OPEN_Z = TRAY_CLOSED_Z + DVD_TRAY_OPEN_DISTANCE

// Tray box 的尺寸——抽成具名常數，這樣凸起 lip（需要跟這個 box 的頂面/前面
// 對齊）可以直接引用，不用同一組數字在兩個地方各寫一次。
const TRAY_BOX_WIDTH = DVD_PLAYER_WIDTH * 0.3
const TRAY_BOX_HEIGHT = DVD_PLAYER_HEIGHT * 0.35
const TRAY_BOX_DEPTH = 0.25
const TRAY_BOX_Z = 0.005

// Tray 是獨立於機身之外的物件，卡在前臉的位置——它的 pivot group 的
// position.z 就是點擊時要 tween 的目標值，機身的 geometry 本身永遠不動。
export function DVDPlayer() {
  const trayPivotRef = useRef<Group>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const pivot = trayPivotRef.current
    return () => {
      if (pivot) gsap.killTweensOf(pivot.position)
    }
  }, [])

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // 不喊停的話，同一條射線只要還打中後面的其他東西（旋鈕、TV 機身），
    // 那些的 handler 也會一起被觸發——就是旋鈕跟 tray 互相誤觸那次修的。
    event.stopPropagation()
    if (!trayPivotRef.current) return
    const next = !isOpen
    setIsOpen(next)
    gsap.to(trayPivotRef.current.position, {
      z: next ? TRAY_OPEN_Z : TRAY_CLOSED_Z,
      duration: DVD_TRAY_ANIM_DURATION,
      ease: 'power2.out',
    })
  }

  return (
    <group name="dvd-player" position={DVD_PLAYER_POSITION}>
      {/* 這裡故意不掛點擊 handler——這是整個機身的範圍（夠寬夠深，幾乎整個
          TV 底下都算在內），掛了可點擊的話，隨便一條打歪的射線只要落在這個
          範圍裡都會誤觸 tray。真正的點擊目標在下面的 tray/lip mesh 上——
          範圍跟位置就跟真實的出片門差不多大，不是整個機身。 */}
      <group name="dvd-player-body" position={[0, DVD_PLAYER_HEIGHT / 2, 0]}>
        <RoundedBox
          args={[DVD_PLAYER_WIDTH, DVD_PLAYER_HEIGHT, DVD_PLAYER_DEPTH]}
          radius={0.008}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#4a4a4a" roughness={0.4} metalness={0.3} />
        </RoundedBox>
      </group>

      {/* 出片匣的軸心——position.z 就是上面 tween 的目標值。前緣凸起放在這裡
          （不是放在 dvd-player-body）是因為它是 tray/抽屜自己的門面，
          必須跟著 tray 一起滑出去，不能焊死在機殼上。 */}
      <group
        name="dvd-player-tray-pivot"
        ref={trayPivotRef}
        position={[0.15, DVD_PLAYER_HEIGHT * 0.3, TRAY_CLOSED_Z]}
      >
        <mesh
          castShadow
          position={[0, 0, TRAY_BOX_Z]}
          onClick={handleClick}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <boxGeometry args={[TRAY_BOX_WIDTH, TRAY_BOX_HEIGHT, TRAY_BOX_DEPTH]} />
          <meshStandardMaterial color="#111" roughness={0.5} />
        </mesh>

        {/* 疊在 tray box 的頂面上，跟它的前面切齊——跟機身那組「疊上去 +
            對齊前臉」的套路一樣，只是這次的父層換成這裡。同樣可以點擊，
            它是抽屜看得到的「門」，跟後面的 tray box 是同一個點擊目標。 */}
        <RoundedBox
          args={[TRAY_BOX_WIDTH, DVD_PLAYER_LIP_HEIGHT, DVD_PLAYER_LIP_DEPTH]}
          radius={0.006}
          smoothness={4}
          position={[
            0,
            TRAY_BOX_HEIGHT / 2 + DVD_PLAYER_LIP_HEIGHT / 2,
            TRAY_BOX_Z + TRAY_BOX_DEPTH / 2 - DVD_PLAYER_LIP_DEPTH / 2,
          ]}
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.3} />
        </RoundedBox>
      </group>
    </group>
  )
}
