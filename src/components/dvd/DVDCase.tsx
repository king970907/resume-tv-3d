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

interface DVDCaseProps {
  // 受控元件——開闔狀態由 Experience.tsx 統一管理（跟 DVDSelector 共用
  // 同一個布林值），這樣選片畫面收起來的時候，盒子會自動跟著關，不用
  // 額外同步兩個各自獨立的開關狀態。onToggle 的門檻（idle 階段、沒有片
  // 正在放、還沒放過片）都在 Experience.tsx 那邊的呼叫處統一判斷，這個
  // 元件不重複檢查。
  isOpen: boolean
  onToggle: () => void
}

export function DVDCase({ isOpen, onToggle }: DVDCaseProps) {
  const { nodes } = useGLTF('/models/dvd-case.glb') as unknown as { nodes: GLTFNodes }
  const frontRef = useRef<Object3D>(null)
  // 前蓋開過一次之後就不再關回去——使用者回報選了光碟之後（isOpen 變
  // false，鏡頭退回螢幕正面）盒蓋也跟著關上，看起來像「隨手把盒子闔上」
  // ，改成盒蓋是單向的：只要開過一次，之後 isOpen 變 false（不管是選了
  // 光碟、還是點背板取消）都不再播放關闔動畫，維持開著留在 TV 頂上，
  // 比較像「拿出光碟後隨手把盒子開著放在旁邊」。用 ref 記，不用 state，
  // 純粹是動畫該往哪個角度補間的旗標，不需要觸發 re-render。
  const hasOpenedRef = useRef(false)

  useEffect(() => {
    if (isOpen) hasOpenedRef.current = true
    const front = frontRef.current
    if (!front) return
    gsap.killTweensOf(front.rotation)
    // 轉的是 z，不是 y——鉸鏈邊緣沿著 three.js 的 Z 軸走（見上面軸對調
    // 的說明：Blender 的「高度」軸匯出後對應 three.js 的 -Z），要繞著
    // 平行於鉸鏈邊緣的軸轉，前蓋才會像書本一樣往上掀開；轉 y（垂直軸）
    // 會變成像門一樣水平橫向甩開，實測過確實是這樣、看起來很怪。
    //
    // DVD_CASE_OPEN_ANGLE 是正值——瀏覽器實測過，負值會讓前蓋往下往前
    // 甩，掀開時整片蓋到 TV 螢幕/旋鈕那一側（使用者回報「開錯邊」）；
    // 正值前蓋才是往後上方掀開，不會擋到 TV。目標角度看 hasOpenedRef，
    // 不是直接看 isOpen——開過一次之後即使 isOpen 變 false，目標角度還是
    // 維持 DVD_CASE_OPEN_ANGLE，蓋子就不會再關回去。
    gsap.to(front.rotation, {
      z: hasOpenedRef.current ? DVD_CASE_OPEN_ANGLE : 0,
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

        {/* 盒子裡原本躺著一片純裝飾、不能點的碟——現在場景只留一片光碟，
            真的可以點、可以飛進 player 的那片改由 DVDSelector.tsx 在世界
            座標渲染（用 DVD_CASE_DISC_REST_POSITION/ROTATION 對齊到這片
            裝飾碟原本在的位置，見 scene.ts 的說明），這裡不用再放一份。 */}
      </group>
    </group>
  )
}

useGLTF.preload('/models/dvd-case.glb')
