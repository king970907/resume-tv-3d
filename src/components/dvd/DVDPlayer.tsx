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
  TV_WIDTH,
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

// 前面板 y——跟 tray pivot 用同一個高度基準，這樣按鈕/顯示幕才會跟 tray
// 視覺上對齊在同一排「控制面板」。
const FRONT_PANEL_Y = DVD_PLAYER_HEIGHT * 0.3
const FRONT_PANEL_Z = DVD_PLAYER_DEPTH / 2 + 0.003 // 貼在機身前臉外一點點，避免 z-fighting

// 裝飾用按鈕（play/stop/eject/power）——純造型，不掛點擊事件；tray 已經佔掉
// 前臉右半邊（x 落在 0.03~0.27），這排按鈕排在左半邊淨空的地方。
const BUTTON_RADIUS = 0.012
const BUTTON_DEPTH = 0.006
const BUTTON_X_POSITIONS = [-0.32, -0.26, -0.2, -0.14]
const BUTTON_Y = FRONT_PANEL_Y - 0.006

// 小顯示幕（LED 時間/頻道區）——跟 TV 螢幕同一套「深色底 + 綠色 emissive」
// 手法，維持同一個復古 CRT/LED 色調，放在按鈕正上方。x 要跟按鈕排中心對齊
// ——原本忘了設，用預設的 0（面板正中央）疊到 tray 的範圍去了。
const DISPLAY_WIDTH = 0.22
const DISPLAY_HEIGHT = 0.012
const DISPLAY_X = BUTTON_X_POSITIONS.reduce((sum, x) => sum + x, 0) / BUTTON_X_POSITIONS.length
const DISPLAY_Y = FRONT_PANEL_Y + 0.018

// Tray 外圍的深色邊框——沒有真的挖洞（three.js primitive 做不到布林運算），
// 用一片比 tray+lip 範圍稍大、又稍微退後於 tray 本身的深色板子疊上去，
// 造成「凹進去一圈」的錯覺：tray 關閉時擋在它前面，視覺上蓋掉大半，
// 只留邊緣一圈深色框看得到。
// TRAY_BOX_HEIGHT + DVD_PLAYER_LIP_HEIGHT 已經是「tray box 底邊到 lip 頂邊」
// 的完整範圍（lip 疊在 tray box 上面，不是重疊），本身就等於機身高度的
// 大半——原本這裡多加了 0.02 當「稍大一點」的留白，結果整片邊框比機身
// 還高，上下都戳出機身邊緣，看起來像浮空貼上去的黑板，不是嵌在機身裡的
// 邊框。留白要遠小於這個量級才不會爆出去。
const TRAY_BEZEL_WIDTH = TRAY_BOX_WIDTH + 0.03
const TRAY_BEZEL_HEIGHT = TRAY_BOX_HEIGHT + DVD_PLAYER_LIP_HEIGHT + 0.006
const TRAY_BEZEL_Y = FRONT_PANEL_Y + DVD_PLAYER_LIP_HEIGHT / 2

// 頂部通風孔——TV（寬 TV_WIDTH）疊在 player（寬 DVD_PLAYER_WIDTH）頂上，
// player 比較寬，左右各露出一條沒被 TV 蓋住的頂面，通風孔就排在這條可見
// 範圍裡。單側 5 條細長 slat，沿 Z 排開。
const VENT_STRIP_INNER_X = TV_WIDTH / 2 + 0.02 // 緊鄰 TV 邊緣留一點邊界，避免視覺上黏在一起
const VENT_STRIP_OUTER_X = DVD_PLAYER_WIDTH / 2 - 0.02 // 機身外緣也留一點邊界
const VENT_COUNT = 5
const VENT_SLAT_WIDTH = 0.012
const VENT_SLAT_DEPTH = 0.2
const VENT_SLAT_HEIGHT = 0.002
const VENT_Y = DVD_PLAYER_HEIGHT + VENT_SLAT_HEIGHT / 2 // 疊在頂面上，不是嵌進去

// 橡膠腳——四個底角，圓柱體本身軸向就是 Y，不用額外旋轉。往內縮一點
// （不是完全貼齊邊角），避免跟機身的圓角邊緣互相蓋到。
const FOOT_RADIUS = 0.02
const FOOT_HEIGHT = 0.008
const FOOT_INSET_X = 0.05
const FOOT_INSET_Z = 0.05
const FOOT_Y = FOOT_HEIGHT / 2
const FOOT_POSITIONS: [number, number][] = [
  [DVD_PLAYER_WIDTH / 2 - FOOT_INSET_X, DVD_PLAYER_DEPTH / 2 - FOOT_INSET_Z],
  [-(DVD_PLAYER_WIDTH / 2 - FOOT_INSET_X), DVD_PLAYER_DEPTH / 2 - FOOT_INSET_Z],
  [DVD_PLAYER_WIDTH / 2 - FOOT_INSET_X, -(DVD_PLAYER_DEPTH / 2 - FOOT_INSET_Z)],
  [-(DVD_PLAYER_WIDTH / 2 - FOOT_INSET_X), -(DVD_PLAYER_DEPTH / 2 - FOOT_INSET_Z)],
]

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

      {/* Tray 外圍的深色邊框——放在 tray 本體之前（z 比較小，退後於 tray），
          這樣 tray 關閉時會擋在它前面，只露出邊緣一圈，看起來像凹進去的
          插槽開口。純造型，不掛點擊事件。 */}
      <RoundedBox
        args={[TRAY_BEZEL_WIDTH, TRAY_BEZEL_HEIGHT, 0.006]}
        radius={0.004}
        smoothness={4}
        position={[0.15, TRAY_BEZEL_Y, FRONT_PANEL_Z]}
      >
        <meshStandardMaterial color="#161616" roughness={0.6} />
      </RoundedBox>

      {/* 前面板：裝飾用按鈕（play/stop/eject/power）+ 小顯示幕，都是純造型，
          不掛點擊事件——tray 才是真正能點的互動目標，見上面 dvd-player-body
          的註解。 */}
      <group name="dvd-player-front-panel">
        <mesh position={[DISPLAY_X, DISPLAY_Y, FRONT_PANEL_Z]}>
          <planeGeometry args={[DISPLAY_WIDTH, DISPLAY_HEIGHT]} />
          <meshStandardMaterial color="#0a1a0a" emissive="#39ff14" emissiveIntensity={0.1} />
        </mesh>

        {BUTTON_X_POSITIONS.map((x, i) => (
          <mesh key={x} position={[x, BUTTON_Y, FRONT_PANEL_Z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[BUTTON_RADIUS, BUTTON_RADIUS, BUTTON_DEPTH, 16]} />
            {/* 最左邊那顆當電源鍵，用顏色跟其他按鈕區分開來，不用額外幾何 */}
            <meshStandardMaterial color={i === 0 ? '#5a2020' : '#1a1a1a'} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* 頂部通風孔——TV 比機身窄，頂面左右各露出一條，slat 排在這條可見
          範圍裡，見上面 VENT_STRIP_* 常數的註解。左右對稱各一組。 */}
      <group name="dvd-player-vents">
        {/* 右側可見範圍內，從內緣（貼近 TV）到外緣（機身邊緣）平均分布
            VENT_COUNT 條，左側直接把 x 取負號鏡射，不用重算一次。 */}
        {Array.from({ length: VENT_COUNT }, (_, i) => {
          const t = VENT_COUNT > 1 ? i / (VENT_COUNT - 1) : 0.5
          return VENT_STRIP_INNER_X + t * (VENT_STRIP_OUTER_X - VENT_STRIP_INNER_X)
        }).flatMap((rightX) => [rightX, -rightX])
          .map((x) => (
            <mesh key={x} position={[x, VENT_Y, 0]}>
              <boxGeometry args={[VENT_SLAT_WIDTH, VENT_SLAT_HEIGHT, VENT_SLAT_DEPTH]} />
              <meshStandardMaterial color="#161616" roughness={0.7} />
            </mesh>
          ))}
      </group>

      {/* 橡膠腳——四個底角，見上面 FOOT_POSITIONS 的註解。 */}
      <group name="dvd-player-feet">
        {FOOT_POSITIONS.map(([x, z]) => (
          <mesh key={`${x}-${z}`} position={[x, FOOT_Y, z]} castShadow>
            <cylinderGeometry args={[FOOT_RADIUS, FOOT_RADIUS, FOOT_HEIGHT, 16]} />
            <meshStandardMaterial color="#111" roughness={0.8} />
          </mesh>
        ))}
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
