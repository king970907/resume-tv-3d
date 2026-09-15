import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import type { Object3D } from 'three'
import {
  DVD_CASE_DEPTH,
  DVD_CASE_HEIGHT,
  DVD_CASE_REST_POSITION,
  DVD_CASE_REST_ROTATION,
  DVD_CASE_WIDTH,
} from '@/cores/const/scene'
import { DVD_CASE_OPEN_ANGLE, DVD_CASE_OPEN_DURATION } from '@/cores/const/interaction'
import { PROJECTS } from '@/data/projects'
import type { Project } from '@/cores/types/project'
import { DVD } from './DVD'

// 真實模型從 Blender 匯出（blender-project/models/dvd-case/dvd-case.blend
// → public/models/dvd-case.glb）。跟 TV/DVD player 不同的是，Blender 端
// 這個模型的原點在「後殼外底面左下角」，不是置中——DVD_CASE_REST_POSITION/
// ROTATION 這兩個常數原本是照「置中在物件原點」的舊 placeholder box 設計
// 的，所以載入後先用內層 group 把模型往回推半個寬/高/厚度，變成「效果上
// 置中在原點」，外層的 REST_POSITION/ROTATION 才不用整套重推。
type GLTFNodes = Record<string, Object3D>

// 盒子裡的碟片純粹是裝飾——真正的資料在 DVDSelector 那組飄浮碟片裡。固定
// 一片，不要跟著 PROJECTS 數量長：疊太多片會像一疊沒對齊的百葉窗（3 片
// 就已經看得出一圈一圈的邊緣，4、5 片只會更明顯），而且盒子本來就不該
// 暗示「裡面裝著跟項目數量一樣多的碟」。
const DECORATIVE_DISC_PROJECT: Project = PROJECTS[0]

interface DVDCaseProps {
  // 受控元件——開闔狀態由 Experience.tsx 統一管理（跟 DVDSelector 共用
  // 同一個布林值），這樣選片畫面收起來的時候，盒子會自動跟著關，不用
  // 額外同步兩個各自獨立的開關狀態。
  isOpen: boolean
  onToggle: () => void
}

// 碟片疊在夾持花瓣卡榫上方的高度，見
// blender-project/models/dvd-case/notes.md 的「光碟裝配方向」那節。
const DISC_REST_Z = 0.0062

export function DVDCase({ isOpen, onToggle }: DVDCaseProps) {
  const { nodes } = useGLTF('/models/dvd-case.glb') as unknown as { nodes: GLTFNodes }
  const frontRef = useRef<Object3D>(null)

  useEffect(() => {
    const front = frontRef.current
    if (!front) return
    gsap.killTweensOf(front.rotation)
    gsap.to(front.rotation, {
      y: isOpen ? DVD_CASE_OPEN_ANGLE : 0,
      duration: DVD_CASE_OPEN_DURATION,
      ease: 'power2.out',
    })
  }, [isOpen])

  useEffect(() => {
    const front = frontRef.current
    return () => {
      if (front) gsap.killTweensOf(front.rotation)
    }
  }, [])

  const handleToggleOpen = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onToggle()
  }

  return (
    <group name="dvd-case-rest" position={DVD_CASE_REST_POSITION} rotation={DVD_CASE_REST_ROTATION}>
      {/* 重新置中：把 Blender 原點(左下角)搬回幾何中心，這樣外層的
          REST_POSITION/ROTATION 沿用舊的「置中在原點」假設不用改。 */}
      <group
        position={[-DVD_CASE_WIDTH / 2, -DVD_CASE_HEIGHT / 2, -DVD_CASE_DEPTH / 2]}
        onClick={handleToggleOpen}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
      >
        {/* 後殼/夾持卡榫等所有靜態部件——前蓋雖然也在這個節點樹裡，但下面
            單獨用 primitive 把它抓出來接鉸鏈旋轉，three.js 的
            Object3D.add() 會自動把它從這裡的階層搬過去，不會重複渲染。 */}
        <primitive object={nodes.DVD_Case} />

        <primitive object={nodes.DVD_Case_Front} ref={frontRef} />

        {/* 盒子裡靜靜躺著一片裝飾用的碟——真正拿來選的那組是 DVDSelector，
            開盒後在鏡頭前面用世界座標飛出來，不會被這個盒子的姿態影響。
            座標用跟 DVD_Case 原始 Blender 座標同一套（花瓣卡榫中心在
            (CASE_WIDTH/2, CASE_HEIGHT/2)），這樣才會跟上面 primitive 一起
            被外層的置中 group 帶到正確位置——不能改用 (0,0)，那是置中
            "群組本身" 的量，不是花瓣卡榫在群組座標系裡的位置。 */}
        <DVD
          project={DECORATIVE_DISC_PROJECT}
          position={[DVD_CASE_WIDTH / 2, DVD_CASE_HEIGHT / 2, DISC_REST_Z]}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/models/dvd-case.glb')
