import { useEffect, useState } from 'react'
import { SRGBColorSpace, TextureLoader, type Texture } from 'three'

// drei 的 useTexture 沒辦法處理「這個路徑可能是 undefined」——它是純
// Suspense 式的 hook，傳 undefined 進去會直接丟錯，Hook 呼叫順序又不能
// 條件式跳過。這裡自己寫一個允許「沒有圖」這個狀態的版本：url 是
// undefined 時單純回傳 null，讓呼叫端決定要不要覆蓋掉模型原本烤好的
// 材質貼圖（DVD 光碟標籤、DVD 盒封面內頁目前都是這樣用——沒有提供
// project.thumbnail 就維持原本的預設材質，不是空白/報錯）。
export function useOptionalTexture(url: string | undefined): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    if (!url) return

    let active = true
    let loaded: Texture | null = null
    const loader = new TextureLoader()
    loader.load(url, (result) => {
      // 貼圖預設 colorSpace 是 NoColorSpace（three.js r152 之後的行為）——
      // 拿來當一般照片顏色貼圖（.map）沒設對的話，renderer 不會做 gamma
      // 校正，顏色會偏白/偏淡，不是真的圖片本來的顏色。
      result.colorSpace = SRGBColorSpace
      if (!active) {
        result.dispose()
        return
      }
      loaded = result
      setTexture(result)
    })

    return () => {
      active = false
      loaded?.dispose()
    }
  }, [url])

  // url 變成 undefined 時，state 裡可能還留著上一個 url 載入的貼圖物件
  // （cleanup 會 dispose 掉它，但 state 本身要等下一次真正的 setTexture
  // 才會更新）——直接在這裡依 url 決定回傳值，不用另外呼叫 setTexture(null)
  // 讓「沒有 url」這個分支也觸發一次 render，那個值本來就能在這裡算出來。
  return url ? texture : null
}
