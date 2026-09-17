// TV 螢幕內容系統的時間/鏡頭常數。跟 interaction.ts 分開放一個檔案，
// 因為這組常數專門服務「開場 → 聚焦 → loading → 看畫面 → 全螢幕」這條
// 獨立的流程，不是點擊物件的動畫參數。

// 雜訊重繪間隔（毫秒）——不用每幀都重畫，肉眼看起來像雜訊不需要真的
// 60fps 全隨機，節流一下省效能。
export const SCREEN_NOISE_REDRAW_INTERVAL_MS = 90

// 開場：使用者點擊後，全螢幕文字淡出的時間。
export const INTRO_FADE_OUT_DURATION = 0.5 // 秒

// 開場：鏡頭從預設角度運鏡聚焦到螢幕正面的時間。
export const CAMERA_FOCUS_DURATION = 1.4 // 秒

// 開場：聚焦完成後，螢幕維持雜訊 loading 畫面的時間，之後才顯示畫面1。
export const INTRO_LOADING_DURATION = 1.2 // 秒

// 旋鈕換頁：畫面切到雜訊、停留、再顯示新頁面的時間。要比開場 loading
// 短很多——每按一次旋鈕都要等一大段時間會很煩，這裡只是做出「訊號重新
// 對頻」的感覺，不是真的在載入東西。
export const CHANNEL_SWITCH_LOADING_DURATION = 0.45 // 秒

// 點擊螢幕：運鏡快速貼近螢幕、填滿視窗的時間，比開場聚焦快很多——這是
// 使用者主動要「放大看」，動作要俐落，不要拖。
export const SCREEN_ZOOM_IN_DURATION = 0.6 // 秒

// 點擊螢幕運鏡貼近後，螢幕維持雜訊（zoom-loading 階段）的時間，之後才
// 換成全螢幕 DOM 疊層——比開場的 INTRO_LOADING_DURATION 短很多，這裡是
//「點螢幕準備進全螢幕」的過場閃頻，不是電視開機的等待感，拖太久反而
// 讓使用者覺得卡頓。
export const SCREEN_ZOOM_LOADING_DURATION = 0.35 // 秒

// 全螢幕 DOM 疊層淡入/淡出的時間。
export const FULLSCREEN_OVERLAY_FADE_DURATION = 0.35 // 秒

// 退出全螢幕：鏡頭從貼近螢幕的位置運鏡退回「聚焦」姿態（不是退回最原始
// 的開場遠景，聚焦姿態才是「正常看電視」的預設狀態）的時間。
export const SCREEN_ZOOM_OUT_DURATION = 0.6 // 秒

// 螢幕聚焦鏡頭姿態——比預設 CAMERA_POSITION/CAMERA_TARGET（見 scene.ts）
// 貼近螢幕很多，構圖上螢幕要佔畫面大半，跟預設的「看整台電視」角度做出
// 區別，而且要是「正面朝向」的構圖，不是預設那種側 3/4 角度。
//
// 第一版直接沿用預設鏡頭的側角度只是拉近，畫面上看起來像「沒有轉正」
// （旋鈕面板被斜向拉伸、螢幕邊框歪斜）。改用瀏覽器實測過的方法確認：
// 把鏡頭放在跟 TV_Body 世界座標 X 中心對齊的正前方（TV_Body 邊界框量出
// 來的中心 x≈0，不是螢幕玻璃自己的 x≈-0.065——螢幕玻璃偏在機身左側，
// 用它自己的中心當鏡頭對齊基準，看到的其實是機身整體偏一邊的斜角），
// 鏡頭位置/目標點的 X 對齊之後，畫面才是真的左右對稱、沒有透視歪斜。
//
// 光是「鏡頭對正」還不夠：對正後貼近拍還是會因為近距離+標準視角（45°）
// 產生明顯的廣角透視變形（旋鈕面板這種有實際深度的部件會被拉伸），實測
// 比對過用「縮小視角(FOV)+同時拉遠對應距離」的長焦式構圖，才是畫面看
// 起來真正「平整、正面」的做法，跟預設鏡頭共用同一顆 three.js camera，
// 靠 gsap 同時把 fov 也補間過去，套用完後要記得呼叫
// camera.updateProjectionMatrix()，這兩組鏡頭姿態各自搭配一個對應的 fov。
//
// 原本這組構圖只填滿螢幕本身（target y=0.3、距離較近），DVD player 只
// 露出頂端一條窄邊、盒子幾乎整個被裁到畫面外——使用者希望「平常看到的
// 畫面」是 TV、player、盒子三個都完整入鏡，不是只看到電視螢幕特寫。
// 改成 target 往下移到整組（player 底部 y=0 ~ 盒子頂面 y≈0.5）的垂直
// 中心附近、鏡頭拉遠+ fov 加大到 32，瀏覽器截圖跟使用者給的參考構圖
// 比對調出來的，螢幕文字仍然讀得清楚，同時三個物件都完整在畫面裡、
// 上下都留了一點邊界，不會貼著畫面邊緣。
export const CAMERA_FOCUS_FOV = 32
export const CAMERA_FOCUS_TARGET: [number, number, number] = [0, 0.25, 0.14]
export const CAMERA_FOCUS_POSITION: [number, number, number] = [0, 0.34, 1.6]

// 全螢幕運鏡的鏡頭姿態——比聚焦姿態更貼近螢幕，構圖上螢幕要幾乎填滿
// 整個視窗（因為運鏡結束後緊接著會切換成真正的 2D DOM 疊層蓋滿視窗，
// 這段運鏡只是視覺上的過場，不用真的讓 three.js 貼圖畫面本身達到銳利
// 全螢幕的程度）。這裡改成對準螢幕玻璃自己的中心（不是機身中心）——
// 全螢幕運鏡的目的是「貼近螢幕本身」，不是「機身正面」，跟聚焦姿態的
// 對齊基準不同是刻意的。同樣搭配縮小的 fov，理由跟聚焦姿態一樣。
export const CAMERA_ZOOM_FOV = 22
export const CAMERA_ZOOM_TARGET: [number, number, number] = [-0.065, 0.302, 0.148]
export const CAMERA_ZOOM_POSITION: [number, number, number] = [-0.065, 0.302, 0.5]
