import { useEffect, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Vector3 } from 'three'
import type { AmbientLight, DirectionalLight, PointLight } from 'three'
import { RetroTV } from '@/components/tv/RetroTV'
import { DVDPlayer } from '@/components/dvd/DVDPlayer'
import { DVDCase } from '@/components/dvd/DVDCase'
import { DVDSelector } from '@/components/dvd/DVDSelector'
import { CAMERA_TARGET, ORBIT_MAX_DISTANCE, ORBIT_MIN_DISTANCE } from '@/cores/const/scene'
import {
  DVD_SELECTOR_CAMERA_DISTANCE,
  DVD_SELECTOR_CAMERA_DOLLY_DURATION,
  SCENE_DIM_DURATION,
  SCENE_DIM_FACTOR,
} from '@/cores/const/interaction'
import type { Project } from '@/cores/types/project'

// 場景燈光的基準亮度——選片畫面開啟時，這幾顆燈會一起乘上 SCENE_DIM_FACTOR
// 暗下去，只留選片專用的那顆燈亮著，做出「背景變黑、碟片浮現」的效果。
//
// 整體配色走「暗房裡看電視」的調子：主光源刻意調暖（像一盞立燈），背後
// 的點綴光改冷色（像窗外透進來的月光/街燈），冷暖對比讓場景在昏暗中還是
// 有層次，不會整片死灰——原本點綴光用高飽和度的螢光綠(#39ff14)，強度又
// 開到 4，等於用一顆綠色探照燈打整個場景，任何中性色材質被掃到都會泛
// 綠，這才是「泛綠光」真正的原因（不是材質本身的問題）。
//
// 第一版把整體強度壓太低，變成「看不清楚細節的暗」而不是「氣氛暗但細節
// 清楚」（使用者拿一個暗色系但物件細節都看得很清楚的參考網站對比）。配色
// 維持不變，只把每個光源的強度整體調高一截，尤其是主光源跟補光——暗色系
// 的重點是背景/陰影夠暗、對比夠強，不是把物件本身也一起悶暗。
const AMBIENT_BASE_INTENSITY = 0.45
const KEY_LIGHT_BASE_INTENSITY = 1.6
const FILL_LIGHT_BASE_INTENSITY = 0.6
const ACCENT_LIGHT_BASE_INTENSITY = 4
const SELECTOR_LIGHT_INTENSITY = 1.5

export function Experience() {
  const ambientRef = useRef<AmbientLight>(null)
  const keyLightRef = useRef<DirectionalLight>(null)
  const fillLightRef = useRef<DirectionalLight>(null)
  const accentLightRef = useRef<PointLight>(null)
  const selectorLightRef = useRef<PointLight>(null)

  // OrbitControls 直接掛在 canvas DOM 上監聽，跟 R3F 自己的事件系統是兩條
  // 線——選片期間鏡頭必須固定不動（DVDSelector 用「開啟當下」的鏡頭位置算
  // 扇形排列，鏡頭一動排列就對不上），所以要透過 makeDefault + useThree
  // 拿到同一個實例手動鎖住，跟旋鈕拖曳時期解決的問題是同一招。
  const controls = useThree((state) => state.controls) as unknown as { enabled: boolean } | null
  const camera = useThree((state) => state.camera)

  const [isDvdSelectorOpen, setIsDvdSelectorOpen] = useState(false)
  // 跟 isDvdSelectorOpen 分開——盒蓋掀開/場景變暗要立刻觸發，但碟片扇形
  // 展開要等鏡頭確定拉到安全距離之後才能算位置（DVDSelector 是用「開啟
  // 當下」的鏡頭位置算扇形排列，鏡頭如果太近，碟片會直接卡進 TV 機身）。
  const [discsReady, setDiscsReady] = useState(false)

  useEffect(() => {
    if (!isDvdSelectorOpen) {
      // 收起來不用管鏡頭有沒有拉遠過——直接讓碟片收回去就好，鏡頭位置
      // 沒有要求要還原。
      gsap.killTweensOf(camera.position)
      // oxlint-disable-next-line react/set-state-in-effect
      setDiscsReady(false)
      return
    }

    const distance = camera.position.distanceTo(new Vector3(...CAMERA_TARGET))
    if (distance >= DVD_SELECTOR_CAMERA_DISTANCE) {
      // 鏡頭已經夠遠，不用拉——直接標記碟片可以展開，不用等一個不會發生
      // 的動畫。
      // oxlint-disable-next-line react/set-state-in-effect
      setDiscsReady(true)
      return
    }

    // 沿著「目標→目前鏡頭位置」的方向往外拉，不是沿著鏡頭朝向——這樣
    // 拉遠的過程中畫面看起來像純粹後退，不會因為順便轉向而讓使用者暈。
    const direction = camera.position.clone().sub(new Vector3(...CAMERA_TARGET)).normalize()
    const targetPosition = new Vector3(...CAMERA_TARGET).addScaledVector(direction, DVD_SELECTOR_CAMERA_DISTANCE)

    gsap.killTweensOf(camera.position)
    gsap.to(camera.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: DVD_SELECTOR_CAMERA_DOLLY_DURATION,
      ease: 'power2.out',
      onComplete: () => setDiscsReady(true),
    })
  }, [isDvdSelectorOpen, camera])

  useEffect(() => {
    const lights = [ambientRef.current, keyLightRef.current, fillLightRef.current, accentLightRef.current]
    const bases = [
      AMBIENT_BASE_INTENSITY,
      KEY_LIGHT_BASE_INTENSITY,
      FILL_LIGHT_BASE_INTENSITY,
      ACCENT_LIGHT_BASE_INTENSITY,
    ]
    const dimTarget = isDvdSelectorOpen ? SCENE_DIM_FACTOR : 1

    lights.forEach((light, i) => {
      if (!light) return
      gsap.killTweensOf(light)
      gsap.to(light, { intensity: bases[i] * dimTarget, duration: SCENE_DIM_DURATION, ease: 'power2.out' })
    })

    if (selectorLightRef.current) {
      gsap.killTweensOf(selectorLightRef.current)
      gsap.to(selectorLightRef.current, {
        intensity: isDvdSelectorOpen ? SELECTOR_LIGHT_INTENSITY : 0,
        duration: SCENE_DIM_DURATION,
        ease: 'power2.out',
      })
    }

    // `controls` 是 useThree 拿到的、真實存在的 three.js OrbitControls 實例，
    // 不是 React state——直接改 .enabled 就是它預期的用法（跟 RetroTV 旋鈕
    // 那次踩過的 TS/lint 坑一樣）。
    // oxlint-disable-next-line react/immutability
    if (controls) controls.enabled = !isDvdSelectorOpen
  }, [isDvdSelectorOpen, controls])

  const handleSelectProject = (project: Project) => {
    // 佔位——真正的行為是「切換 TV 螢幕顯示這個項目」，但螢幕貼圖系統
    // （Phase 2）還沒做，先用 alert 頂著，之後直接替換這行就好，不用動
    // 選片畫面關閉的邏輯。
    alert(`切換螢幕：${project.title}`)
    setIsDvdSelectorOpen(false)
  }

  return (
    <>
      <color attach="background" args={['#0a0a0a']} />

      {/* 整體墊底亮度——墊高最低亮度，陰影死角才不會死黑一片。壓低強度、
          調暖色溫，讓沒被主光/補光直接照到的角落是「暗房裡的餘光」，
          不是死黑，也不是大白天的平光。 */}
      <ambientLight ref={ambientRef} intensity={AMBIENT_BASE_INTENSITY} color="#3a3226" />

      {/* 主光源——從上方偏前打下來，唯一負責投影的光。調成暖色（像一盞
          立燈/檯燈），是整個場景裡最亮、最有存在感的光源。 */}
      <directionalLight
        ref={keyLightRef}
        position={[0.6, 1.2, 0.8]}
        intensity={KEY_LIGHT_BASE_INTENSITY}
        color="#ffd9a8"
        castShadow
      />

      {/* 補光——低角度、從前方打過來，專門補到 DVD player 的正面，
          因為它疊在 TV 下層，正好被主光源的影子擋住。刻意調成很淡的冷白
          （不是純白），強度也壓低，功能上只是把主光源照不到的死角托出
          輪廓，不會搶主光源的暖色調。 */}
      <directionalLight
        ref={fillLightRef}
        position={[0, 0.35, 1.2]}
        intensity={FILL_LIGHT_BASE_INTENSITY}
        color="#cfd8e8"
      />

      {/* 背後點綴——像窗外透進來的月光/街燈，冷色調跟主光源的暖色形成對比，
          把物件從全黑背景裡「勾」出輪廓光，暗房氛圍才有層次感，不是一片
          死黑。這個版本的 three.js 點光源用的是 candela 單位，數字要開得
          比方向光/環境光大很多才看得出來。（原本這裡是高飽和度螢光綠、
          強度開到 4，等於拿一顆綠色探照燈打整個場景，才是造成「泛綠光」
          的原因——不是材質問題，見上面 ACCENT_LIGHT_BASE_INTENSITY 的說明。） */}
      <pointLight ref={accentLightRef} position={[-0.6, 0.5, -0.4]} intensity={ACCENT_LIGHT_BASE_INTENSITY} color="#5aa9e6" />

      {/* 選片專用燈——平常是 0，選片畫面開啟時才亮起來，讓其他光源暗下去
          後，飛到鏡頭前的碟片還是看得清楚。位置抓在鏡頭常駐位置前方一點。 */}
      <pointLight ref={selectorLightRef} position={[0.3, 0.6, 1.2]} intensity={0} color="#e8e8d0" />

      <DVDPlayer />
      <RetroTV />
      <DVDCase isOpen={isDvdSelectorOpen} onToggle={() => setIsDvdSelectorOpen((v) => !v)} />
      <DVDSelector
        isOpen={discsReady}
        onSelect={handleSelectProject}
        onClose={() => setIsDvdSelectorOpen(false)}
      />

      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      <OrbitControls
        makeDefault
        enablePan={false}
        target={CAMERA_TARGET}
        minDistance={ORBIT_MIN_DISTANCE}
        maxDistance={ORBIT_MAX_DISTANCE}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}
