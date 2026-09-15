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
//
// ⚠️ 置中的位移量不是單純的 [-W/2,-H/2,-D/2]——Blender 匯出成 glTF 時
// 座標軸會重新映射：Blender 的 Y 軸（case 的「高度」方向）對應到 three.js
// 的 **負 Z 軸**，Blender 的 Z 軸（case 的「厚度」方向）才對應到 three.js
// 的 **Y 軸**。這是實測 `DVD_Case_Front` 鉸鏈原點座標抓到的：Blender 端
// 鉸鏈在 `(0, CASE_HEIGHT/2, TRAY_TOTAL_H)`，匯出後在 three.js 變成
// `(0, TRAY_TOTAL_H, -CASE_HEIGHT/2)`——Y跟Z對調，Z還變號。所以置中偏移
// 是 `[-W/2, -D/2, +H/2]`，不是照原本 Blender 座標軸直覺排的
// `[-W/2, -H/2, -D/2]`（那樣會把只有9mm厚的厚度軸誤置中成17mm高度軸的
// 量，導致 case 看起來像沒躺平、站得很高）。
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
    // 轉的是 z，不是 y——鉸鏈邊緣沿著 three.js 的 Z 軸走（見上面軸對調
    // 的說明：Blender 的「高度」軸匯出後對應 three.js 的 -Z），要繞著
    // 平行於鉸鏈邊緣的軸轉，前蓋才會像書本一樣往上掀開；轉 y（垂直軸）
    // 會變成像門一樣水平橫向甩開，實測過確實是這樣、看起來很怪。
    gsap.to(front.rotation, {
      z: isOpen ? DVD_CASE_OPEN_ANGLE : 0,
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
        position={[-DVD_CASE_WIDTH / 2, -DVD_CASE_DEPTH / 2, DVD_CASE_HEIGHT / 2]}
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
            水平位置(花瓣卡榫中心)用跟 DVD_Case 原始 Blender 座標同一套
            (CASE_WIDTH/2 給 X)，這樣才會跟上面 primitive 一起被外層的
            置中 group 帶到正確位置；Y/Z 套用上面說明的軸對調規則——
            DISC_REST_Z(厚度方向的懸浮高度)放 Y，水平的另一軸放
            -CASE_HEIGHT/2（負號，同樣是 Blender Y 對應 three.js -Z）。 */}
        <DVD
          project={DECORATIVE_DISC_PROJECT}
          position={[DVD_CASE_WIDTH / 2, DISC_REST_Z, -DVD_CASE_HEIGHT / 2]}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/models/dvd-case.glb')
