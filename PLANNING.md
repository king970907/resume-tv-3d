# resume-tv-3d 規劃文件

給人看的進度/決策記錄。技術規範（stack、資料夾規則、螢幕渲染策略的最終定案）在 [CLAUDE.md](./CLAUDE.md)，這份文件著重「現在做到哪、為什麼這樣做、接下來要做什麼」。

## 專案概念

履歷網站，場景是一台復古 CRT 電視 + DVD player + DVD 盒，全部是真的 3D mesh（不是 CSS 3D，這點跟前身 [My-RetroTV](https://github.com/king970907/My-RetroTV) 不同）。

- TV 顯示履歷內容（About / Experience / Skills / Contact 之類的頻道）
- DVD 盒裡放的是作品集項目，插進 DVD player「播放」某個項目
- 3D 場景裡螢幕只顯示**貼圖預覽**；點擊某個頻道/項目後鏡頭 dolly-in，貼圖淡出、切成全螢幕 DOM overlay 顯示真正的互動內容，離開再淡回 3D 場景

## 關鍵架構決策

### 1 unit = 1 公尺，比例基準

TV / DVD player / DVD 盒的尺寸都是「真實世界參考尺寸 × 1.2（展示尺度加成）」換算來的，寫在 [`cores/const/scene.ts`](./src/cores/const/scene.ts)。地面在 `y = 0`，每個物件的 group 原點是自己的「底部中心」，不是幾何中心。

### Pivot 搬到邊緣，不是幾何中心

反覆用到的套路：想讓一個物件繞著「非中心」的某個點動（貼地站立、鉸鏈開闔、滑軌平移），就把它包進一個 group，group 放在你要的支點，物件在 group 裡面再位移抵銷掉「幾何置中」的偏移。目前用在：

- TV / DVD player 機身「站在地上」（往上位移半個高度）
- DVD 盒斜靠 TV（`dvd-case-lean-pivot`：軸心搬到盒子底部，傾斜時才是「底部不動、頂部往 TV 靠」，不會插進 TV 裡）
- DVD 盒封面掀蓋（`dvd-case-front-cover-pivot`：軸心搬到書脊邊緣）
- DVD player tray 前緣凸起：直接掛在 `dvd-player-tray-pivot` 底下（不是機身），這樣凸起會跟著 tray 一起滑出，不是焊死在機殼上

### 螢幕渲染策略（已定案，見 CLAUDE.md）

3D 內是貼圖，互動時全螢幕 DOM overlay。放棄了 `<Html transform>`（透視/遮擋問題）跟 DOM→canvas render-to-texture（失去原生互動、要自己接 raycast→DOM 座標轉換）。

### ⚠️ 已作廢：建模原本是程式化 blockout（three.js primitive），Blender 待評估

寫這節的時候全部是 three.js/drei primitive（`RoundedBox`、`boxGeometry`、`cylinderGeometry`）手刻，還沒用 Blender，CRT 電視後方圓弧「大屁股」造型當時也還做不出來（box 系列 geometry 生不出「前方正、後方漸縮成圓弧」這種漸變曲面）。這兩個問題後來都靠 Blender pass 解決了（見下方「已完成：Blender pass」）——`LatheGeometry`/primitive 疊層這條路線整個放棄，四個模型全部重新在 Blender 建。

### TV 旋鈕：點擊式切頁，不是自由拖曳

原本做的是連續拖曳（放開後 GSAP snap 到最近 30° 檔位），改成**點一下轉固定角度**，理由：

- 拖曳手感不好控制（使用者回報的原始問題）
- 拖曳勢必要跟 `OrbitControls` 搶事件——改成點擊之後，`OrbitControls` 只在偵測到「按下+移動」才會反應，單純點擊完全不會被搶，連帶拿掉了整套 `useThree`/`controls.enabled` 開關機制，也拿掉了 `@use-gesture/react` 這個依賴

角度公式是 `360° / pageCount`，`pageCount` 是 `RetroTV` 的 prop（**預設 0**——資料層還沒接上真正的內容，旋鈕先保持可點但點了不會動，不假裝有內容，見 `KNOB_DEFAULT_PAGE_COUNT`）。Step 3 做完 DVD 選片後，`Experience.tsx` 會把「目前插入的 DVD 有幾個作品」傳進這個 prop——3 個作品就是 120°、4 個就是 90°，公式本身不用改，只是換數字。

### DVD 盒：一片碟 = 一個項目，直接點碟選片

盒子打開後裡面排的是 `PROJECTS`（`src/data/projects.json`）裡的每一筆，一筆一片碟。選片是**直接點想要的那片碟**（不是用旋鈕當選單游標）。旋鈕全程跟選片無關，只負責固定的個人頁面。

`DVD_CASE_WIDTH`/`DVD_CASE_DEPTH` 之前被手動對調過（0.02/0.23），這次因為要塞碟片進去踩到真的坑：碟片直徑 0.144 比對調後的寬度窄 10 倍塞不進去，改成側面朝向後，圓面又落在跟主鏡頭視角垂直的平面上、幾乎看不到（用鮮豔除錯色 + 大幅轉鏡頭驗證過，不是猜的）。最後改回真實比例（`WIDTH=0.23`、`DEPTH=0.02`）才解決，這也是「先驗證再下結論」這個習慣抓到的一個好例子。

### DVD 盒姿態改版：平放 TV 頂上，站立/斜靠那套整段拿掉

盒子改回真實比例後，原本「站立、底部支點、傾角靠向 TV」那套姿態徹底跑掉——同一組角度套在變寬的物體上，寬的那個方向邊緣被甩出去更多，會撐出去疊到 DVD player。與其重新算一次寬版的傾斜三角函數，直接改需求：盒子**平放在 TV 頂面**，隨性斜放，不需要任何「底部貼地」的物理支點。整段 lean-pivot 邏輯拿掉，換成單純的 `DVD_CASE_REST_POSITION` + `DVD_CASE_REST_ROTATION`。

### ⚠️ 已作廢：選片畫面原本是「碟片飛到鏡頭前扇形排列」，後來整個重做成「單一光碟 + 盒子特寫視角」

這節以下是**歷史記錄**，不是目前的設計——早期版本場景裡有 3 片碟，開盒後 `DVDSelector` 把它們用世界座標飛到鏡頭前排成扇形，靠打光製造黑背景，點黑色背景關閉。這套設計後來被判定是換片 bug 的根源（新舊碟同時 attach 在 tray 上互相重疊），使用者確認後**整個場景改成只留一片光碟**：開 case 直接運鏡到盒子特寫視角（跟「點螢幕聚焦」同一種運鏡模式），點光碟觸發「放進 player」動畫、點光碟以外的地方鏡頭退回螢幕正面。

現在的設計（`DVDSelector.tsx`）：
- 只渲染 `PROJECTS[0]` 這一片碟，靜置在盒子裡量出來的世界座標（`DVD_CASE_DISC_REST_POSITION`/`ROTATION`，見 `scene.ts`），沒有扇形排列、沒有待機自轉、沒有 hover 轉正這些邏輯
- 開盒觸發的是**完整運鏡到 `CAMERA_CASE_POSITION`/`TARGET`/`FOV`**（比照 `CAMERA_FOCUS_*` 那套「同時補間 position/target/fov」手法），不是原本的「鏡頭拉遠留扇形排列空間」
- 插入動畫從三段式（縮小→邊飛邊翻正→放下）簡化成兩段式（邊飛邊翻正→放下）——原本的「縮小」是因為碟片在扇形排列時被放大過，現在碟片本來就是盒內原始大小，不需要這段
- 「點黑色背景關閉選片」這個 raycast 技巧本身沿用下來（背板只有開盒時才掛載/可見，理由跟原本一樣）
- `DVDCase.tsx` 再點一次可以真的關闔蓋子（跟選片/取消選片維持蓋子開著是分開判斷的兩種情境，見 `explicitCloseRef`）

以下這三段原本描述舊設計的內容保留當歷史記錄用（曾經踩過的坑仍然有參考價值），不代表現在的行為：

<details>
<summary>舊設計細節（已作廢，僅供參考）</summary>

點開盒子後，`DVDSelector`（跟 `DVDCase`平行、不是它的子元件）把 `PROJECTS` 的碟片用**世界座標**飛到鏡頭前方排成一列——故意不當 `DVDCase` 的子物件，因為子物件的座標會被盒子本身的姿態（現在是平放+隨機斜角）汙染，算不出乾淨的「鏡頭前方」目標點。

背景變黑不是疊一層黑色 DOM 遮罩（那樣會把飛出來的 3D 碟片一起蓋住）——而是把場景所有光源暗到趨近 0（`SCENE_DIM_FACTOR`），只留一顆選片專用的燈亮著。場景背景本來就是接近全黑的 `#0a0a0a`，其他物件沒了光照自然融進黑色背景，不用額外處理透明度或遮罩。

選片期間 `OrbitControls` 會被鎖住（`controls.enabled = false`）——`DVDSelector` 是用「開盒當下」鏡頭的位置/朝向算一次扇形排列，鏡頭如果中途被轉走，排列就對不上，所以整段選片畫面鏡頭必須固定不動，跟旋鈕拖曳期間鎖鏡頭是同一招。

點黑色背景關閉選片：`DVDSelector` 裡有一片平常不可見的全螢幕背板，跟碟片同一條鏡頭前方的射線、擺在碟片扇形的後面，只有選片開啟時才會 `visible = true`（同時打開它的 raycast——three.js 物件 `visible = false` 會連 raycast 也一起關掉，關閉時不會誤擋到場景其他物件的點擊）。點碟片以外的地方，射線會穿過扇形之間的空隙打中這片背板，觸發跟選片/點盒子一樣的關閉邏輯。

</details>

### 履歷/作品內容改成 JSON，跟程式碼分開放

`src/data/` 底下每份內容資料都拆成「`.json`（實際內容）+ 同名 `.ts`（型別註解、re-export）」兩個檔案——JSON 不能寫型別/註解，這兩個功能留在 `.ts`。純粹是 build-time 靜態 import（Vite 原生支援，`tsconfig.app.json` 開 `resolveJsonModule` 配合型別檢查），不是為了「不重新部署就能改內容」——沒有引入 runtime fetch，仍然完全靜態、沒有 API 呼叫。目的單純是內容資料方便直接編輯、跟渲染邏輯分開放。

### 履歷頁動畫：打字機、血條填滿、經歷逐筆浮現，都是純 CSS，沒有用動畫套件

DOM 疊層（`src/components/ui/`）目前只有 GSAP 管 3D 那邊的鏡頭/DVD 動畫，2D 頁面本身完全沒有用動畫套件——三個效果都是 `@keyframes` + React 算好 `animationDelay`/`animation-delay` 用 inline style 帶進去做錯開，加一個自己寫的 `useTypewriter` hook（`setInterval` 累加字元數，不是各字元各自排 timer）。打字機支援「跑到一半點畫面直接完成」的手勢（Undertale 對話框標準操作），用一個 ref 存 interval id 讓 `skip()` 可以從 hook 外部呼叫。

### ⚠️ 已作廢：DVD player 造型細節這節描述的是舊版 primitive 疊層做法

跟上面 DVD 選片流程一樣是歷史記錄——寫這節的時候 `DVDPlayer` 還是 three.js primitive 手刻疊層（沒有真的挖洞/雕刻），後來整台換成 Blender 匯出的真實模型（見「已完成：Blender pass」），tray 凹槽、通風孔這些現在是真的幾何，不是疊層矇混。內容保留當年踩過的坑供參考：

<details>
<summary>舊設計細節（已作廢，僅供參考）</summary>

`DVDPlayer.tsx` 這輪加了前面板按鈕（play/stop/eject/power，純造型不掛點擊）、LED 顯示幕（跟 TV 螢幕同一套深色底+綠色 emissive 手法）、tray 外圍深色邊框、頂部通風孔、四角橡膠腳。全部是 primitive 疊層，沒有一項用到布林運算或雕刻：

- **Tray 邊框「凹進去」的錯覺**：three.js primitive 疊層做不出真的挖洞，做法是疊一片比 tray+lip 範圍略大、z 深度比 tray 前緣退後一點的深色板子——tray 關閉時擋在它前面，只露出邊緣一圈，肉眼看起來像凹槽。tray 打開時邊框會整片露出來（因為背後沒有真的凹陷幾何），這是已知的簡化，之後要做更精緻的凹槽再處理。
- **通風孔位置抓在 TV 蓋不到的地方**：TV（寬 `TV_WIDTH`）疊在 player（寬 `DVD_PLAYER_WIDTH`）頂上，player 比較寬，左右各露出一條沒被蓋住的頂面——通風孔就排在這條可見範圍裡，不是隨便找地方擺，擺錯地方會整排被 TV 蓋住看不到。
- **橡膠腳沒有真的墊高機身**：機身底部沿用原本 `y = 0` 貼地的邏輯不動，腳只是往內縮一點貼在底角、y 範圍跟機身底部同一個基準，不是真的把整組往上抬——抬高的話 `TV_POSITION`（算式是 `DVD_PLAYER_HEIGHT` 的倍數）也要跟著調，這輪沒有動這條，只做純視覺的腳。

</details>

### 已完成：Blender pass

TV / DVD player / DVD / DVD case 全部換成 Blender 匯出的真實模型（`blender-project/`，各自有 `notes.md` 記錄建模細節/踩過的坑），不再是 three.js primitive blockout。原本列在「尚未處理」的 CRT 大屁股弧面、機身造型細節、材質細節都隨著這次換模型一併解決（Blender 端可以直接做出漸縮曲面/挖洞/雕刻，不用再疊層矇混）。

## 目前進度

核心體驗已經全部打通、可以從頭玩到尾。已完成：

- [x] Vite + React 19 + R3F scaffold → Blender 模型 pass：TV / DVD player / DVD / DVD case 全部換成 Blender 匯出的真實模型（不再是 primitive blockout，細節見上方「已完成：Blender pass」跟 `blender-project/` 各自的 notes.md）
- [x] 燈光/材質：Blender 端直接做材質（不再是單色 `meshStandardMaterial`），場景燈光功能性調校完成（candela 單位踩過的坑記在下面）
- [x] DVD player tray 開闔、TV 旋鈕點擊式切頁
- [x] DVD 盒開闔 + 選片：單一光碟設計（見上方「已作廢：選片畫面...」），開盒運鏡到盒子特寫、點光碟放進 player、再點一次 case 關闔蓋子
- [x] 選片後「插入 player」動畫：兩段式（邊飛邊翻正→放下），繞過 TV 機身，不會穿模
- [x] 螢幕內容系統：3D 場景小 canvas 貼圖 + 全螢幕 DOM 疊層雙軌，共用 `TerminalFrame` 黑白像素終端機視覺（Undertale 風格）
- [x] 履歷三頁（簡介/技能/經歷）+ 作品三頻道，內容資料改 JSON 跟程式碼分開放
- [x] 履歷頁進場動畫：打字機（含點擊跳過）、技能血條填滿、經歷逐筆浮現，都是純 CSS + 一個自己寫的 hook，沒引入動畫套件
- [x] 光碟標籤/盒子封面可以貼真實圖片（`useOptionalTexture`，有圖才 clone 材質換貼圖，沒有就用 Blender 原本烤好的材質）

尚未處理（下面「下一步」有排優先順序建議）：

- [ ] 視覺收尾：HDRI 環境、bloom 後製
- [ ] 背景/環境：地板 + 純色背景，還沒有房間感或環境反射
- [ ] 燈光氛圍：目前是功能性調校（夠亮不過曝），還沒往氛圍/風格化打光調
- [ ] 履歷/作品內容：目前 JSON 裡除了使用者自己的履歷文字之外，作品集三筆都還是 placeholder（只有 `project-1` 有真圖/連結）

## 踩過的坑（值得記住）

- **three.js 新版點光源用 candela 單位**，跟方向光/環境光的簡單倍率完全不是同一個量級，數字不能直接套舊直覺，要用「開很低 → 慢慢加 → 過曝就退」的方式試
- **rotation 的軸心預設是物件自己的幾何中心**——任何「靠、掀、貼地站」的姿態，只要看起來「歪掉插進別的東西裡」，八成是軸心沒搬對地方，不是角度算錯
- **複合 Euler 角（同時給 x/y/z）是依序套用的，每一節繞的是「上一步轉完後的新軸」**，不是三個都繞原始世界軸——轉完 x 之後，物件自己的 y/z 軸方向已經變了，這時候再給 y 或 z 一個角度，實際轉動方向要照轉完 x 之後的新軸算，不能憑直覺套原始世界方向。DVD 盒平放那次踩到：以為是繞垂直軸轉一個隨性角度，其實放錯軸，變成把盒子掀起來插進 TV 裡
- **點擊測試 3D mesh 沒反應時**，先用暫時的 `console.log` 確認 handler 有沒有被呼叫到，區分「event 沒打中」跟「event 打中但邏輯有問題」——mesh 在畫面上可能很細，肉眼點擊容易失準
- **R3F 的 pointer event 會沿著射線打到的每個「有掛 handler」的物件依序觸發**，不是只有最前面那個——不喊 `event.stopPropagation()` 的話，一次點擊可能同時觸發好幾個疊在同一條射線上的控制項（旋鈕跟 tray 曾經因此互相誤觸）。凡是場景裡有多個可互動物件彼此接近/疊放，handler 裡都該加這行
- **`OrbitControls` 在 canvas DOM 上是獨立掛原生監聽器的**，跟 R3F 自己的合成事件系統是兩條線，`stopPropagation()` 攔不住它。要讓某個物件的拖曳/點擊不被鏡頭同時搶走，得幫 `<OrbitControls makeDefault />`，再透過 `useThree(state => state.controls)` 拿到同一個實例，手動切 `.enabled`
- **可互動的 hit-box 範圍要跟造型分開設計**：不要把 `onClick` 隨手掛在整個機身這種大範圍 mesh 上，之後旁邊一長出新的小物件（旋鈕）就會被蓋住/誤觸。掛在真正該負責互動的那個小 mesh（按鈕、把手）上，範圍越貼近視覺上「看起來能按」的區域越好
- **有個跟我們寫的程式碼無關的既有 console 警告**（`useEffect` deps array 長度變化），用 `git stash` + 切回最初 scaffold commit 驗證過，連空場景都會出現——是 `@react-three/fiber` 9.7.0（目前最新穩定版）+ React 19 StrictMode 的相容性小毛病，不影響功能，先不管它
- **RingGeometry 中間是真的洞，沒有 geometry**——點擊測試碟片時，點在正中央（洞附近）射線會直接穿過去，什麼都打不到。看起來像「點擊沒反應」，其實是瞄準的地方本來就沒東西可點，要點在圓環實體的部分
- **自動化/背景分頁的瀏覽器分頁會把 rAF 節流**，GSAP tween 沒有停，只是被拖到極慢的速度跑——不要看動畫「卡住不動」幾秒就斷定邏輯錯了，先加 `onUpdate` log 確認數值有沒有在變，真的在變就是節流，不是 bug。這次選片關閉動畫一度看起來完全沒反應，等了十幾秒才看到它其實一路在跑
- **這個開發環境的 Browser pane，`document.visibilityState` 永遠回報 `"hidden"`**（用 `javascript_tool` 查證過，前景化分頁、開全新分頁都一樣）。瀏覽器對隱藏分頁的 rAF 節流力道不固定，同一套邏輯有時候拖慢跑完、有時候看起來完全卡死（`onUpdate` 一次都不觸發）。這是工具本身的限制，不是能修的程式碼問題——動畫「卡住不動」不能當作邏輯錯誤的證據，優先看 state 有沒有正確流轉（console log 證明 handler/effect 有跑到），視覺上跑完與否在這個環境裡本來就不穩定，真的要看動畫效果得交給使用者在自己的瀏覽器裡確認

## 下一步

核心互動流程已經做完，剩下的都是「收尾/內容」性質，不影響能不能玩，哪一塊先做看使用者想先看到什麼效果，不要自己猜方向。可考慮的優先順序（純建議，非定案）：

1. **補完作品集內容**——目前 `PROJECTS` 只有第一筆有真圖/連結，另外兩筆還是 placeholder，這塊直接影響「這個網站能不能拿去投遞」，優先度可能最高
2. **視覺氛圍收尾**——HDRI 環境、bloom、燈光氛圍調整，這三項通常要一起看效果、互相牽動，適合排在同一輪處理
3. **背景/環境**——地板 + 純色背景目前沒有房間感，跟氛圍收尾那輪一起做比較有效率（背景色調也會影響燈光怎麼調）
4. 更細的東西（如果上面都做完還有餘力）：RWD/手機版適配目前完全沒驗證過、`vite build` 產出的單一 chunk 超過 500KB 警告（見 build log）還沒處理（code-splitting）
