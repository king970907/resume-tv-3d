import { useEffect, useRef, useState } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import type { AmbientLight, DirectionalLight, PointLight } from 'three'
import { RetroTV } from '@/components/tv/RetroTV'
import { DVDPlayer } from '@/components/dvd/DVDPlayer'
import { DVDCase } from '@/components/dvd/DVDCase'
import { DVDSelector } from '@/components/dvd/DVDSelector'
import { CAMERA_TARGET, ORBIT_MAX_DISTANCE, ORBIT_MIN_DISTANCE } from '@/cores/const/scene'
import { SCENE_DIM_DURATION, SCENE_DIM_FACTOR } from '@/cores/const/interaction'
import type { Project } from '@/cores/types/project'

// 場景燈光的基準亮度——選片畫面開啟時，這幾顆燈會一起乘上 SCENE_DIM_FACTOR
// 暗下去，只留選片專用的那顆燈亮著，做出「背景變黑、碟片浮現」的效果。
const AMBIENT_BASE_INTENSITY = 0.7
const KEY_LIGHT_BASE_INTENSITY = 1.2
const FILL_LIGHT_BASE_INTENSITY = 0.5
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

  const [isDvdSelectorOpen, setIsDvdSelectorOpen] = useState(false)

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
    // 還沒接——之後這裡會觸發「碟片飛進 player」的動畫，見 CLAUDE.md Phase 3。
    void project
    setIsDvdSelectorOpen(false)
  }

  return (
    <>
      <color attach="background" args={['#0a0a0a']} />

      {/* 整體墊底亮度——墊高最低亮度，陰影死角才不會死黑一片 */}
      <ambientLight ref={ambientRef} intensity={AMBIENT_BASE_INTENSITY} />

      {/* 主光源——從上方偏前打下來，唯一負責投影的光 */}
      <directionalLight ref={keyLightRef} position={[0.6, 1.2, 0.8]} intensity={KEY_LIGHT_BASE_INTENSITY} castShadow />

      {/* 補光——低角度、從前方打過來，專門補到 DVD player 的正面，
          因為它疊在 TV 下層，正好被主光源的影子擋住 */}
      <directionalLight ref={fillLightRef} position={[0, 0.35, 1.2]} intensity={FILL_LIGHT_BASE_INTENSITY} />

      {/* 點綴——這個版本的 three.js 點光源用的是 candela 單位，數字要開得
          比方向光/環境光大很多才看得出來 */}
      <pointLight ref={accentLightRef} position={[-0.6, 0.5, -0.4]} intensity={ACCENT_LIGHT_BASE_INTENSITY} color="#39ff14" />

      {/* 選片專用燈——平常是 0，選片畫面開啟時才亮起來，讓其他光源暗下去
          後，飛到鏡頭前的碟片還是看得清楚。位置抓在鏡頭常駐位置前方一點。 */}
      <pointLight ref={selectorLightRef} position={[0.3, 0.6, 1.2]} intensity={0} color="#e8e8d0" />

      <DVDPlayer />
      <RetroTV />
      <DVDCase isOpen={isDvdSelectorOpen} onToggle={() => setIsDvdSelectorOpen((v) => !v)} />
      <DVDSelector
        isOpen={isDvdSelectorOpen}
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
