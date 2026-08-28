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

## 目前進度

- [x] Phase 0：Vite + React 19 + R3F scaffold，Canvas/燈光/OrbitControls 跑通
- [x] Phase 1：TV / DVD player / DVD 盒 blockout，pivot 階層照未來互動需求先搭好
- [x] 光線調校：ambient 墊底 + key/fill 方向光 + 綠色 point light 點綴（candela 單位踩過一次坑，記在下面）
- [x] DVD player tray 開闔（GSAP tween on click，含 cleanup）
- [ ] TV 旋鈕拖曳（Step 2 — 需要裝 `@use-gesture/react`，連續手勢轉角度數學）
- [ ] DVD 盒開闔＋選片（Step 3 — hinge 動畫 + 資料驅動的可選 DVD 列表 + 串接 TV 換內容邏輯）
- [ ] 螢幕貼圖系統（頻道/項目預覽貼圖 + 切換）
- [ ] 全螢幕 DOM overlay（鏡頭 dolly-in + 貼圖淡出 + 真實履歷內容）
- [ ] 視覺收尾：HDRI 環境、bloom 後製、材質細節
- [ ] Blender 評估/精修 pass（CRT 大屁股是目前唯一已知一定要處理的項目）

## 踩過的坑（值得記住）

- **three.js 新版點光源用 candela 單位**，跟方向光/環境光的簡單倍率完全不是同一個量級，數字不能直接套舊直覺，要用「開很低 → 慢慢加 → 過曝就退」的方式試
- **rotation 的軸心預設是物件自己的幾何中心**——任何「靠、掀、貼地站」的姿態，只要看起來「歪掉插進別的東西裡」，八成是軸心沒搬對地方，不是角度算錯
- **點擊測試 3D mesh 沒反應時**，先用暫時的 `console.log` 確認 handler 有沒有被呼叫到，區分「event 沒打中」跟「event 打中但邏輯有問題」——mesh 在畫面上可能很細，肉眼點擊容易失準

## 下一步

Step 2：TV 旋鈕拖曳。
