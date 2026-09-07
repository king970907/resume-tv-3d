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

### 建模：程式化 blockout 優先，Blender 待評估

目前全部是 three.js/drei primitive（`RoundedBox`、`boxGeometry`、`cylinderGeometry`）手刻，沒有另外用 Blender。`RoundedBox`（真的有導角幾何，不是貼圖討巧）用在看得到邊緣的外殼；陽春 `boxGeometry` 用在機構件/不顯眼的部件，省三角形成本。

**CRT 電視後方圓弧「大屁股」造型目前跳過**——box 系列 geometry 做不出「前方正、後方漸縮成圓弧」這種漸變曲面，這個留到評估 Blender 的階段再處理（`LatheGeometry` 或 Blender sculpt/lathe 都是候選做法）。

### TV 旋鈕：點擊式切頁，不是自由拖曳

原本做的是連續拖曳（放開後 GSAP snap 到最近 30° 檔位），改成**點一下轉固定角度**，理由：

- 拖曳手感不好控制（使用者回報的原始問題）
- 拖曳勢必要跟 `OrbitControls` 搶事件——改成點擊之後，`OrbitControls` 只在偵測到「按下+移動」才會反應，單純點擊完全不會被搶，連帶拿掉了整套 `useThree`/`controls.enabled` 開關機制，也拿掉了 `@use-gesture/react` 這個依賴

角度公式是 `360° / pageCount`，`pageCount` 是 `RetroTV` 的 prop（**預設 0**——資料層還沒接上真正的內容，旋鈕先保持可點但點了不會動，不假裝有內容，見 `KNOB_DEFAULT_PAGE_COUNT`）。Step 3 做完 DVD 選片後，`Experience.tsx` 會把「目前插入的 DVD 有幾個作品」傳進這個 prop——3 個作品就是 120°、4 個就是 90°，公式本身不用改，只是換數字。

### DVD 盒：一片碟 = 一個項目，直接點碟選片

盒子打開後裡面排的是 `PROJECTS`（`src/data/projects.ts`，目前是 placeholder）裡的每一筆，一筆一片碟。選片是**直接點想要的那片碟**（不是用旋鈕當選單游標），選中後之後會觸發「飛進 player」的動畫（還沒做）。旋鈕全程跟選片無關，只負責固定的個人頁面。

`DVD_CASE_WIDTH`/`DVD_CASE_DEPTH` 之前被手動對調過（0.02/0.23），這次因為要塞碟片進去踩到真的坑：碟片直徑 0.144 比對調後的寬度窄 10 倍塞不進去，改成側面朝向後，圓面又落在跟主鏡頭視角垂直的平面上、幾乎看不到（用鮮豔除錯色 + 大幅轉鏡頭驗證過，不是猜的）。最後改回真實比例（`WIDTH=0.23`、`DEPTH=0.02`）才解決，這也是「先驗證再下結論」這個習慣抓到的一個好例子。

### DVD 盒姿態改版：平放 TV 頂上，站立/斜靠那套整段拿掉

盒子改回真實比例後，原本「站立、底部支點、傾角靠向 TV」那套姿態徹底跑掉——同一組角度套在變寬的物體上，寬的那個方向邊緣被甩出去更多，會撐出去疊到 DVD player。與其重新算一次寬版的傾斜三角函數，直接改需求：盒子**平放在 TV 頂面**，隨性斜放，不需要任何「底部貼地」的物理支點。整段 lean-pivot 邏輯拿掉，換成單純的 `DVD_CASE_REST_POSITION` + `DVD_CASE_REST_ROTATION`。

### 選片畫面：碟片飛到鏡頭前，用打光「製造」黑背景

點開盒子後，`DVDSelector`（跟 `DVDCase`平行、不是它的子元件）把 `PROJECTS` 的碟片用**世界座標**飛到鏡頭前方排成一列——故意不當 `DVDCase` 的子物件，因為子物件的座標會被盒子本身的姿態（現在是平放+隨機斜角）汙染，算不出乾淨的「鏡頭前方」目標點。

背景變黑不是疊一層黑色 DOM 遮罩（那樣會把飛出來的 3D 碟片一起蓋住）——而是把場景所有光源暗到趨近 0（`SCENE_DIM_FACTOR`），只留一顆選片專用的燈亮著。場景背景本來就是接近全黑的 `#0a0a0a`，其他物件沒了光照自然融進黑色背景，不用額外處理透明度或遮罩。

選片期間 `OrbitControls` 會被鎖住（`controls.enabled = false`）——`DVDSelector` 是用「開盒當下」鏡頭的位置/朝向算一次扇形排列，鏡頭如果中途被轉走，排列就對不上，所以整段選片畫面鏡頭必須固定不動，跟旋鈕拖曳期間鎖鏡頭是同一招。

點黑色背景關閉選片：`DVDSelector` 裡有一片平常不可見的全螢幕背板，跟碟片同一條鏡頭前方的射線、擺在碟片扇形的後面，只有選片開啟時才會 `visible = true`（同時打開它的 raycast——three.js 物件 `visible = false` 會連 raycast 也一起關掉，關閉時不會誤擋到場景其他物件的點擊）。點碟片以外的地方，射線會穿過扇形之間的空隙打中這片背板，觸發跟選片/點盒子一樣的關閉邏輯。

## 目前進度

- [x] Phase 0：Vite + React 19 + R3F scaffold，Canvas/燈光/OrbitControls 跑通
- [x] Phase 1：TV / DVD player / DVD 盒 blockout，pivot 階層照未來互動需求先搭好
- [x] 光線調校：ambient 墊底 + key/fill 方向光 + 綠色 point light 點綴（candela 單位踩過一次坑，記在下面）
- [x] DVD player tray 開闔（GSAP tween on click，含 cleanup）
- [x] TV 旋鈕：**點擊式**切頁（原本是拖曳，改成點一下轉一格，見下方決策說明）
- [x] DVD 盒開闔＋選片（Step 3 前半 — hinge 動畫、`Project`/`PROJECTS` 資料層、`DVD.tsx` 碟片、開盒後排列可點擊的碟）
- [x] DVD 盒改平放 TV 頂上（拿掉站立/傾斜那套姿態邏輯）
- [x] 選片畫面：碟片飛到鏡頭前 + 場景燈光暗下去（`DVDSelector`，見上方架構決策）
- [x] 碟片閒置自轉 + hover 轉正對鏡頭；碟片幾何體改成有洞（RingGeometry x2 + 開口 CylinderGeometry），正反面材質分開
- [x] `DVDCase` 改成受控元件（`isOpen`/`onToggle` 由 `Experience` 統一管），選片關閉時盒子自動跟著關
- [x] 點黑色背景（碟片以外的地方）也能關閉選片畫面（`DVDSelector` 內的隱形背板）
- [ ] 選片後「插入 player」動畫（碟片飛進 DVD player、tray 收回）（Step 3 後半）
- [ ] `alert` 佔位換成真的「TV 換內容」邏輯——依賴螢幕貼圖系統（Phase 2）先做完
- [ ] 螢幕貼圖系統（頻道/項目預覽貼圖 + 切換）
- [ ] 全螢幕 DOM overlay（鏡頭 dolly-in + 貼圖淡出 + 真實履歷內容）
- [ ] 視覺收尾：HDRI 環境、bloom 後製、材質細節
- [ ] Blender 評估/精修 pass（CRT 大屁股是目前唯一已知一定要處理的項目）

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

Step 3 後半：選片後把碟片飛進 DVD player 的動畫（tray 收回）。做完這步 Step 3 就算全部收尾，接著會進 Phase 2（螢幕貼圖系統），`alert` 佔位到時候一起換掉。

（旋鈕的 `pageCount` 不用等——選片是直接點碟片，旋鈕全程跟 DVD 無關，只管 4 個固定個人頁面，這條已經做完了，之前寫進「下一步」是規劃殘留，拿掉了。）
