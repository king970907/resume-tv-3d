import { next } from '@vercel/functions'

// Vercel Routing Middleware——只在部署到 Vercel 後才會真的執行（本機
// `vite dev`/`vite preview` 不會跑這段，沒有辦法在這個 repo 裡本機驗證，
// 只能部署後實測）。檔案位置/檔名是 Vercel 的硬性規定：一定要叫
// `middleware.ts`、放在跟 package.json 同一層（repo 根目錄），不能搬進
// src/ 或改名，Vercel 才認得到。
//
// 目的：擋掉「別的網站直接連我們的 .glb 網址當自己的素材用」（盜連）——
// 不是、也不可能做到「完全防止下載」，訪客用自己的瀏覽器開這個網站，
// 瀏覽器本來就得把完整的模型位元組下載下來才能畫出 3D 場景，這件事
// 前端網站沒有辦法擋（也不需要擋，訪客本來就該看得到網站正常運作）。
// 這裡只防「不是從這個網站本身發出的請求」，例如別人在他們自己的頁面
// 直接 <script src="這裡的網址/models/tv.glb">，或用 curl/爬蟲不帶
// referer 直接抓。
export const config = {
  matcher: '/models/:path*',
}

export default function middleware(request: Request) {
  const referer = request.headers.get('referer')
  const { origin } = new URL(request.url)

  if (referer) {
    try {
      if (new URL(referer).origin === origin) {
        return next()
      }
    } catch {
      // referer 格式壞掉（理論上瀏覽器不會送出壞格式，但保險起見還是當
      // 作沒有 referer 處理），直接往下擋掉，不要讓 URL 解析失敗變成
      // 一次未處理的例外把整個 middleware 弄掛。
    }
  }

  return new Response('Forbidden', { status: 403 })
}
