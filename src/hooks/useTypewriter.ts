import { useEffect, useRef, useState } from 'react'

// 逐字打字機效果——回傳目前該顯示的子字串。text 換了（例如切到別頁
// 又切回來，元件重新 mount）就從頭開始播放，不用呼叫端自己重置。用
// setInterval 累加字元數，不是各字元各自排 setTimeout，避免大量計時器；
// 用「字元數」而不是「毫秒長度」控制速度，中英文混排、含標點/換行時
// 每個字元視為等長一格，觀感才會均勻，不會英文字母部分跑很快、中文
// 部分跑很慢。
//
// 回傳的 skip() 讓呼叫端可以提供「再點一次直接跑完」的互動（Undertale
// 對話框的標準手勢）——直接把 count 設到底、順便清掉還在跑的
// interval，不等它自然跑完。
export function useTypewriter(text: string, msPerChar: number): { displayed: string; done: boolean; skip: () => void } {
  const [state, setState] = useState({ text, count: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // text 變了就重置——照 React 官方建議的「render 期間直接 setState」
  // 寫法（不是丟進 useEffect 裡在掛載後才重置），這樣新 text 的第一次
  // 渲染就是 count=0 的正確畫面，不會先閃一格「count 還沒歸零」的舊
  // 內容，也不會多觸發一次 effect-then-render 的往返。
  if (state.text !== text) {
    setState({ text, count: 0 })
  }

  useEffect(() => {
    if (!text) return
    const id = setInterval(() => {
      setState((s) => {
        if (s.count + 1 >= text.length) clearInterval(id)
        return { text: s.text, count: s.count + 1 }
      })
    }, msPerChar)
    intervalRef.current = id
    return () => clearInterval(id)
  }, [text, msPerChar])

  const count = state.text === text ? state.count : 0

  const skip = () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
    setState({ text, count: text.length })
  }

  return { displayed: text.slice(0, count), done: count >= text.length, skip }
}
