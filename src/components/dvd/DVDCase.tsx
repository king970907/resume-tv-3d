import { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import gsap from 'gsap'
import { DoubleSide } from 'three'
import type { Mesh, MeshStandardMaterial, Object3D } from 'three'
import {
  DVD_CASE_DEPTH,
  DVD_CASE_HEIGHT,
  DVD_CASE_REST_POSITION,
  DVD_CASE_REST_ROTATION,
  DVD_CASE_WIDTH,
} from '@/cores/const/scene'
import { CLICK_DRAG_THRESHOLD_PX, DVD_CASE_OPEN_ANGLE, DVD_CASE_OPEN_DURATION } from '@/cores/const/interaction'
import { PROJECTS } from '@/data/projects'
import { useOptionalTexture } from '@/hooks/useOptionalTexture'

// 場景固定只有一片可選的光碟（PROJECTS[0]），跟 DVDSelector.tsx 的
// DISC_PROJECT 是同一片——封面內頁貼圖用這片的資料，不是另外開一個
// prop 從外面傳（case 本來就只代表這一片，直接在這裡讀資料層，跟
// DVDSelector.tsx 的做法一致）。
const COVER_PROJECT = PROJECTS[0]
// 封面內頁優先用 caseCover（矩形封面圖），沒有的話才退回跟光碟標籤
// 共用的 thumbnail——光碟是圓形、盒子封面是矩形，適合的圖不一定一樣。
const COVER_IMAGE = COVER_PROJECT.caseCover ?? COVER_PROJECT.thumbnail

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
  const coverRef = useRef<Object3D>(null)
  const coverTexture = useOptionalTexture(COVER_IMAGE)

  // 封面內頁材質（Blender 端節點/材質名 DVD_Case_Cover_Insert /
  // DVD_Case_Cover_Mat，UV 已經是量好的整面矩形展開，見對話紀錄的驗證）
  // ——理由跟 DVD.tsx 光碟標籤那邊 clone 材質一樣：有圖才 clone 一份塞
  // 真的圖片貼圖，沒有就維持模型原本的材質，不強制要有圖。
  useEffect(() => {
    const cover = coverRef.current as unknown as Mesh | null
    if (!cover || !coverTexture) return
    const material = (cover.material as MeshStandardMaterial).clone()
    material.map = coverTexture
    // 雙面顯示，理由跟 DVD.tsx 光碟標籤那邊一樣——這台機器這個 session
    // 連不上 Blender MCP，沒辦法直接確認這片薄殼實際朝哪一面，兩面都畫
    // 保險，避免使用者傳的封面圖因為法向量猜錯完全看不到。
    material.side = DoubleSide
    cover.material = material
    return () => {
      material.dispose()
    }
  }, [coverTexture])
  // 前蓋原本是單向的（開過一次之後 isOpen 變 false 都不會關回去）——因為
  // 選了光碟、或點背板取消選片時 isOpen 也會變 false，但那兩種情境蓋子
  // 應該維持開著（「拿出光碟後隨手把盒子開著放在旁邊」，使用者確認過的
  // 行為，見下面 explicitCloseRef 的說明）。後來使用者要求「再點一次
  // case」要能真的把蓋子關回去，所以改成：只有「使用者自己再點一次 case」
  // 這個情境才真的關，其餘讓 isOpen 變 false 的情境（選片、點背板取消）
  // 蓋子還是維持開著，兩種「isOpen 變 false」的原因要分開判斷，不能只看
  // isOpen 本身。
  const hasOpenedRef = useRef(false)
  // 是不是「使用者自己再點一次 case」造成的這次關閉——用 ref 記、不用
  // state，純粹是給下面這個 effect 讀一次性的旗標，不需要觸發 re-render，
  // 而且要在 handleToggleOpen 呼叫 onToggle() 之前就同步設好，這個 effect
  // 才讀得到正確的值（onToggle 觸發的 setState 是非同步的，effect 要等
  // 下一輪 re-render 才會跑，但 ref 是同步寫入，順序上不會有問題）。
  const explicitCloseRef = useRef(false)

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
    // 正值前蓋才是往後上方掀開，不會擋到 TV。
    let targetAngle: number
    if (isOpen) {
      targetAngle = DVD_CASE_OPEN_ANGLE
    } else if (explicitCloseRef.current) {
      // 使用者自己再點一次關的，真的關回去，旗標用完就重設。
      targetAngle = 0
      explicitCloseRef.current = false
    } else {
      // 選片/點背板取消造成的 isOpen=false，蓋子維持原本開/關的狀態。
      targetAngle = hasOpenedRef.current ? DVD_CASE_OPEN_ANGLE : 0
    }
    gsap.to(front.rotation, {
      z: targetAngle,
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
    // 理由跟 DVD.tsx/DVDSelector.tsx 那兩處一樣——失敗的拖曳手勢（例如
    // 盒子特寫視角時想拖鏡頭，結果 OrbitControls 被鎖住轉不動）放開滑鼠
    // 時還是會被 R3F 當成一次 click，沒有這個判斷會誤觸發開闔盒子，見
    // CLICK_DRAG_THRESHOLD_PX 的說明。
    if (event.delta > CLICK_DRAG_THRESHOLD_PX) return
    // 目前已經開著、使用者又點了一次 case——這次點擊會把 isOpen 切成
    // false，而且是「使用者自己要關」的那種，蓋子要真的關回去（見上面
    // explicitCloseRef 的說明）。一定要在呼叫 onToggle() 之前設，不能
    // 事後補。
    if (isOpen) explicitCloseRef.current = true
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

        {/* 封面內頁（DVD_Case_Cover_Insert）故意巢狀放在前蓋 primitive
            裡面，不是跟前蓋同一層的兄弟節點——瀏覽器實測過兩者的靜止
            world quaternion 完全一致（封面內頁的姿態就是照「貼在前蓋
            內面」算出來的），拆成兄弟節點的話封面內頁會停在闔起來的
            角度不動，前蓋自己轉開之後兩者就分家、內頁憑空浮在半空中。
            當前蓋的子節點，gsap tween 前蓋 rotation 時封面內頁會自動
            跟著轉，不用另外幫它補一次動畫。 */}
        <primitive object={nodes.DVD_Case_Front} ref={frontRef}>
          {/* 有 project.thumbnail 時貼上真的圖片，見上面的 useEffect。 */}
          <primitive object={nodes.DVD_Case_Cover_Insert} ref={coverRef} />
        </primitive>

        {/* 盒子裡原本躺著一片純裝飾、不能點的碟——現在場景只留一片光碟，
            真的可以點、可以飛進 player 的那片改由 DVDSelector.tsx 在世界
            座標渲染（用 DVD_CASE_DISC_REST_POSITION/ROTATION 對齊到這片
            裝飾碟原本在的位置，見 scene.ts 的說明），這裡不用再放一份。 */}
      </group>
    </group>
  )
}

useGLTF.preload('/models/dvd-case.glb')
