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

// 全螢幕 DOM 疊層淡入/淡出的時間。
export const FULLSCREEN_OVERLAY_FADE_DURATION = 0.35 // 秒

// 退出全螢幕：鏡頭從貼近螢幕的位置運鏡退回「聚焦」姿態（不是退回最原始
// 的開場遠景，聚焦姿態才是「正常看電視」的預設狀態）的時間。
export const SCREEN_ZOOM_OUT_DURATION = 0.6 // 秒

// 螢幕聚焦鏡頭姿態——比預設 CAMERA_POSITION/CAMERA_TARGET（見 scene.ts）
// 貼近螢幕很多，構圖上螢幕要佔畫面大半，跟預設的「看整台電視」角度做出
// 區別。目標點/位置都是用瀏覽器量過 TV_Screen_Glass 的實際世界座標
// （世界座標中心 ≈ [-0.065, 0.302, 0.148]，法向量朝向鏡頭那側）算出來的
// 起始值，再照畫面調整，不是憑感覺硬填。
export const CAMERA_FOCUS_TARGET: [number, number, number] = [-0.03, 0.3, 0.12]
export const CAMERA_FOCUS_POSITION: [number, number, number] = [0.18, 0.42, 0.85]

// 全螢幕運鏡的鏡頭姿態——比聚焦姿態更貼近螢幕，構圖上螢幕要幾乎填滿
// 整個視窗（因為運鏡結束後緊接著會切換成真正的 2D DOM 疊層蓋滿視窗，
// 這段運鏡只是視覺上的過場，不用真的讓 three.js 貼圖畫面本身達到銳利
// 全螢幕的程度）。
export const CAMERA_ZOOM_TARGET: [number, number, number] = [-0.065, 0.302, 0.148]
export const CAMERA_ZOOM_POSITION: [number, number, number] = [-0.03, 0.32, 0.35]
