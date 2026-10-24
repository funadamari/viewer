const params = new URLSearchParams(window.location.search);

// 読み込む報告書のJSONファイル
const reportDataUrl = params.get("data") ;

// 報告書データはJSONから読み込む
let pages = [];
let reportTitle = "";

let currentPage = 1;
let currentPageIndex = 0;

const image = document.getElementById("image");
const title = document.getElementById("title");
const imageStage = document.getElementById("imageStage");
const video = document.getElementById("video");


 // 動画の全画面表示ボタン
const videoFullscreenButton =
  document.getElementById("videoFullscreenButton");

// 全画面表示に入る前に再生中だったかを記録
let resumeAfterIOSFullscreen = false;

// 動画終了後、全画面解除を待って読み込む次ページ
let pendingIOSFullscreenNextPageIndex = null;
let reopenIOSFullscreenForNextVideo = false;

if (video && videoFullscreenButton) {

// iPhoneで全画面表示を終了したときの処理
video.addEventListener("webkitendfullscreen", () => {

  // 動画終了によるページ切り替えの場合
if (pendingIOSFullscreenNextPageIndex !== null) {
  const nextIndex = pendingIOSFullscreenNextPageIndex;
  const nextPage = pages[nextIndex];

  // 次ページが動画なら、全画面表示への復帰を予約
  reopenIOSFullscreenForNextVideo =
    !!(nextPage &&
       (nextPage.type === "video" || nextPage.video));

  pendingIOSFullscreenNextPageIndex = null;
  resumeAfterIOSFullscreen = false;

  loadPage(nextIndex);
  return;
}
 
  // 通常の全画面解除なら、再生中だった動画を再開
  if (!resumeAfterIOSFullscreen) {
    return;
  }

  resumeAfterIOSFullscreen = false;

  // iOS側の全画面終了処理が完了するのを待つ
  setTimeout(() => {
    if (video.paused && !video.ended) {
      video.play().catch((error) => {
        console.warn(
          "全画面解除後の再生再開に失敗しました:",
          error
        );
      });
    }
  }, 500);
});
 
  // 全画面表示ボタンのクリック処理
  videoFullscreenButton.addEventListener("click", async () => {
    try {
      // iPhone向け：動画専用の全画面表示
      if (typeof video.webkitEnterFullscreen === "function") {
        resumeAfterIOSFullscreen = !video.paused && !video.ended;

        video.webkitEnterFullscreen();
        return;
      }

      // PCなど：標準の全画面表示
      if (typeof video.requestFullscreen === "function") {
        await video.requestFullscreen();
        return;
      }

      console.warn("全画面表示に対応していません。");
    } catch (error) {
      console.warn("全画面表示に失敗しました:", error);
    }
  });
}

const zoomInButton = document.getElementById("zoomIn");
const zoomOutButton = document.getElementById("zoomOut");
const resetViewButton = document.getElementById("resetView");
const closeButton = document.getElementById("closeButton");
const tocButton = document.getElementById("tocButton");
const helpButton = document.getElementById("helpButton");
const helpOverlay = document.getElementById("helpOverlay");
const helpClose = document.getElementById("helpClose");

helpOverlay.style.display = "none";

const prevPageButton = document.getElementById("prevPage");
const nextPageButton = document.getElementById("nextPage");
const pageIndicator = document.getElementById("pageIndicator");

const pageNavigation =
  document.getElementById("pageNavigation");
const imageControls =
  document.getElementById("imageControls");

const audioBar = document.getElementById("audioBar");

// スマートフォン横向きの画像ページでは、操作部を自動的に隠して
// 画像の表示領域を広げる。画像をタップすると一時的に再表示する。
let imageControlsHideTimer = null;
const landscapeTouchQuery = window.matchMedia(
  "(orientation: landscape) and (pointer: coarse)"
);

function shouldAutoHideImageControls() {
  return landscapeTouchQuery.matches;
}

function showImageControlsTemporarily() {
  const viewer = document.getElementById("viewer");
  if (!viewer || viewer.classList.contains("video-mode") || !shouldAutoHideImageControls()) {
    return;
  }

  viewer.classList.remove("image-controls-hidden");
  if (imageControlsHideTimer !== null) {
    clearTimeout(imageControlsHideTimer);
  }
  imageControlsHideTimer = setTimeout(() => {
    hideImageControlsForLandscape();
  }, 5000);
}

function hideImageControlsForLandscape() {
  const viewer = document.getElementById("viewer");
  if (imageControlsHideTimer !== null) {
    clearTimeout(imageControlsHideTimer);
    imageControlsHideTimer = null;
  }
  if (
    viewer &&
    !viewer.classList.contains("video-mode") &&
    shouldAutoHideImageControls()
  ) {
    viewer.classList.add("image-controls-hidden");
  }
}

// 既存のHTMLを変更せず、画像ページの横向き表示用スタイルを追加する。
const imageControlsStyle = document.createElement("style");
imageControlsStyle.textContent = `
  @media (orientation: landscape) and (pointer: coarse) {
    /* 横向きの画像ページは画面全体を画像ステージに使う */
    #viewer:not(.video-mode) {
      position: relative !important;
      width: 100vw !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
      overflow: hidden !important;
    }
    #viewer:not(.video-mode) #imageStage {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      min-height: 0 !important;
      flex: none !important;
    }
    /* コントロール表示中は画像を少し暗くして、透明な操作部を見やすくする */
    #viewer:not(.video-mode) #imageStage img {
      transition: filter 180ms ease !important;
    }
    #viewer:not(.video-mode):not(.image-controls-hidden) #imageStage img {
      filter: brightness(0.55) !important;
    }
    #viewer:not(.video-mode).image-controls-hidden #imageStage img {
      filter: brightness(1) !important;
    }
    /*
     * コントロールの位置は縦向き時の既存CSSをそのまま使用する。
     * 横向き専用の top / bottom / left / transform / position 指定は行わず、
     * 向きを変えても各コントロールの配置を変えない。
     * 背景だけ透明にし、画像の表示領域を縮めない。
     */
    #viewer:not(.video-mode) #audioBar,
    #viewer:not(.video-mode) #pageNavigation,
    #viewer:not(.video-mode) #imageControls {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      max-width: 98vw !important;
      box-sizing: border-box !important;
    }
    /* 横向きでも、ページ操作と音声操作は縦向きと同様に画面下部へ集約する。
       画像コントロールは既存の右上位置を維持し、下部の操作部と分離する。 */

    /* 下部の操作部を3段に分離：ページ、音声、最後に自動再生ボタン */

    /* ページコントロール：上段 */
    #viewer:not(.video-mode) #pageNavigation {
      position: fixed !important;
      left: 0 !important;
      right: 0 !important;
      bottom: calc(env(safe-area-inset-bottom) + 88px) !important;
      top: auto !important;
      height: 42px !important;
      flex: 0 0 42px !important;
      z-index: 10019 !important;
      margin: 0 !important;
      background: transparent !important;
    }

    /* 音声コントロール：中段。高さを抑えて1行に収める */
    #viewer:not(.video-mode) #audioBar {
      position: fixed !important;
      left: 0 !important;
      right: 0 !important;
      bottom: calc(env(safe-area-inset-bottom) + 35px) !important;
      top: auto !important;
      z-index: 10020 !important;
      display: flex !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 5px !important;
      width: 100% !important;
      height: 46px !important;
      min-height: 0 !important;
      max-height: 46px !important;
      padding: 4px 6px !important;
      margin: 0 !important;
      overflow: visible !important;
      background: transparent !important;
      border: none !important;
      box-sizing: border-box !important;
    }

    /* 自動再生ボタン：最下段。位置は変えない */
    #viewer:not(.video-mode) #autoPlayToggle {
      position: fixed !important;
      left: 50% !important;
      right: auto !important;
      bottom: calc(env(safe-area-inset-bottom) + 2px) !important;
      top: auto !important;
      transform: translateX(-50%) !important;
      z-index: 10021 !important;
      margin: 0 !important;
      height: 30px !important;
    }
    #viewer:not(.video-mode) #audioBar button,
    #viewer:not(.video-mode) #pageNavigation button,
    #viewer:not(.video-mode) #imageControls button {
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
    }
    /*
     * 横向きでは音声操作をコンパクトな1行にまとめる。
     * 再生位置スライダーと音量スライダーを短くし、時間表示・速度選択も
     * 同じ行に収める。画面幅に応じてスライダーだけが伸縮する。
     */
    #viewer:not(.video-mode) #audioBar {
      display: flex !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 5px !important;
      width: 100% !important;
      max-width: 100vw !important;
      padding: 4px 6px !important;
      margin: 0 !important;
      overflow: visible !important;
    }
    #viewer:not(.video-mode) #audioBar > * {
      min-width: 0 !important;
      flex-shrink: 1 !important;
      box-sizing: border-box !important;
    }
    #viewer:not(.video-mode) #back5,
    #viewer:not(.video-mode) #play,
    #viewer:not(.video-mode) #pause,
    #viewer:not(.video-mode) #forward5 {
      flex: 0 0 auto !important;
      padding: 5px !important;
    }
    #viewer:not(.video-mode) #progress {
      flex: 1 1 20% !important;
      width: 20% !important;
      min-width: 45px !important;
      max-width: 25vw !important;
    }
    #viewer:not(.video-mode) #time {
      flex: 0 0 auto !important;
      white-space: nowrap !important;
      font-size: 12px !important;
    }
    #viewer:not(.video-mode) #volume {
      flex: 0 1 14% !important;
      width: 14% !important;
      min-width: 40px !important;
      max-width: 18vw !important;
    }
    #viewer:not(.video-mode) #rate {
      flex: 0 0 auto !important;
      width: auto !important;
      max-width: 62px !important;
      font-size: 12px !important;
      padding: 4px !important;
    }
    #viewer:not(.video-mode) #autoPlayToggle {
      flex: 0 0 auto !important;
      padding: 5px 8px !important;
      font-size: 12px !important;
      white-space: nowrap !important;
    }
    #viewer.image-controls-hidden #title,
    #viewer.image-controls-hidden #audioBar,
    #viewer.image-controls-hidden #pageNavigation,
    #viewer.image-controls-hidden #imageControls,
    #viewer.image-controls-hidden #videoFullscreenButton {
      display: none !important;
    }
  }
`;
document.head.appendChild(imageControlsStyle);

let orientationRefreshTimers = [];

function refreshImageLayoutForOrientation() {
  const viewer = document.getElementById("viewer");
  if (!viewer || viewer.classList.contains("video-mode")) {
    return;
  }

  if (shouldAutoHideImageControls()) {
    hideImageControlsForLandscape();
  } else {
    if (imageControlsHideTimer !== null) {
      clearTimeout(imageControlsHideTimer);
      imageControlsHideTimer = null;
    }
    viewer.classList.remove("image-controls-hidden");
  }

  // iOS Safariでは回転直後に viewport の寸法が数回変わることがある。
  // そのため、寸法が落ち着くまで複数回レイアウトを再計算する。
  const refreshOnce = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (imageNaturalWidth > 0 && imageNaturalHeight > 0) {
          // 回転のたびに拡大率と位置を初期化し、画像全体を画面内に収める。
          resetView();
        }
      });
    });
  };

  orientationRefreshTimers.forEach((timer) => clearTimeout(timer));
  orientationRefreshTimers = [];
  refreshOnce();
  [120, 300, 600].forEach((delay) => {
    orientationRefreshTimers.push(setTimeout(refreshOnce, delay));
  });
}

landscapeTouchQuery.addEventListener("change", refreshImageLayoutForOrientation);
window.addEventListener("orientationchange", refreshImageLayoutForOrientation);
window.addEventListener("resize", refreshImageLayoutForOrientation);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", refreshImageLayoutForOrientation);
}

const audio = document.getElementById("audio");
const back5Button = document.getElementById("back5");
const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const forward5Button = document.getElementById("forward5");
const progress = document.getElementById("progress");
const timeDisplay = document.getElementById("time");
const volume = document.getElementById("volume");
const rate = document.getElementById("rate");

const autoPlayToggle =
  document.getElementById("autoPlayToggle");

let autoPlayEnabled = false;
let audioLoadToken = 0;
let audioContext = null;
let gainNode = null;
let audioSource = null;

function initializeAudioVolume() {
  try {
    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    audioSource = audioContext.createMediaElementSource(audio);
    gainNode = audioContext.createGain();

    audioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);

    gainNode.gain.value = Number(volume.value);
  } catch (error) {
    console.error("Web Audio initialization failed:", error);
  }
}

const INITIAL_SCALE = 0.90;
const MIN_SCALE = 0.10;
const MAX_SCALE = 5.00;
const ZOOM_STEP = 1.20;
const DOUBLE_TAP_SCALE = 2.00;
const DOUBLE_TAP_TIME = 350;
const DOUBLE_TAP_DISTANCE = 30;
const TAP_MOVE_THRESHOLD = 12;

let fitScale = 1;
let scale = INITIAL_SCALE;
let translateX = 0;
let translateY = 0;
let imageNaturalWidth = 0;
let imageNaturalHeight = 0;

let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;

const pointers = new Map();

let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchStartCenterX = 0;
let pinchStartCenterY = 0;

let dragStartX = 0;
let dragStartY = 0;
let dragStartTranslateX = 0;
let dragStartTranslateY = 0;
let dragging = false;


function getViewportSize() {
  const rect = imageStage.getBoundingClientRect();

  return {
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height)
  };
}


function calculateFitScale() {
  if (!imageNaturalWidth || !imageNaturalHeight) {
    return 1;
  }

  const viewport = getViewportSize();

  return Math.min(
    viewport.width / imageNaturalWidth,
    viewport.height / imageNaturalHeight
  );
}


function clampTranslation() {
  const viewport = getViewportSize();

  const displayedWidth = imageNaturalWidth * scale;
  const displayedHeight = imageNaturalHeight * scale;

  if (displayedWidth <= viewport.width) {
    translateX = (viewport.width - displayedWidth) / 2;
  } else {
    translateX = Math.min(
      0,
      Math.max(viewport.width - displayedWidth, translateX)
    );
  }

  if (displayedHeight <= viewport.height) {
    translateY = (viewport.height - displayedHeight) / 2;
  } else {
    translateY = Math.min(
      0,
      Math.max(viewport.height - displayedHeight, translateY)
    );
  }
}


function applyTransform() {
  image.style.transform =
    `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}


function resetView() {
  fitScale = calculateFitScale();

  scale = Math.max(
    MIN_SCALE,
    fitScale * INITIAL_SCALE
  );

  translateX = 0;
  translateY = 0;

  clampTranslation();
  applyTransform();
}


function setScale(newScale, centerX, centerY) {
  const oldScale = scale;

  const nextScale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, newScale)
  );

  if (nextScale === oldScale) {
    return;
  }

  if (
    centerX !== undefined &&
    centerY !== undefined
  ) {
    const imagePointX =
      (centerX - translateX) / oldScale;

    const imagePointY =
      (centerY - translateY) / oldScale;

    scale = nextScale;

    translateX =
      centerX - imagePointX * scale;

    translateY =
      centerY - imagePointY * scale;
  } else {
    scale = nextScale;
  }

  clampTranslation();
  applyTransform();
}


function zoomIn() {
  const viewport = getViewportSize();

  setScale(
    scale * ZOOM_STEP,
    viewport.width / 2,
    viewport.height / 2
  );
}


function zoomOut() {
  const viewport = getViewportSize();

  setScale(
    scale / ZOOM_STEP,
    viewport.width / 2,
    viewport.height / 2
  );
}


function toggleDoubleTapZoom(x, y) {
  const targetScale =
    scale < fitScale * 1.5
      ? Math.min(
          MAX_SCALE,
          Math.max(
            MIN_SCALE,
            fitScale * DOUBLE_TAP_SCALE
          )
        )
      : Math.max(
          MIN_SCALE,
          fitScale * INITIAL_SCALE
        );

  setScale(targetScale, x, y);
}


function distanceBetween(a, b) {
  return Math.hypot(
    a.clientX - b.clientX,
    a.clientY - b.clientY
  );
}


function midpoint(a, b) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  };
}

let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartScale = 1;
let swipeEligible = false;

function handlePointerDown(event) {
  // 各種コントロール上の操作は、
  // 画像のドラッグ／ピンチ／ダブルタップ処理から除外する。
  if (
    event.target.closest("#video") ||
    event.target.closest("#imageControls") ||
    event.target.closest("#pageNavigation") ||
    event.target.closest("#audioBar") ||
    event.target.closest("#tableOfContents") ||
    event.target.closest("#helpOverlay")
  ) {
    return;
  }  
  
  if (pointers.size === 0) {
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
    swipeStartScale = scale;
    swipeEligible = true;
  } else {
    // 2本指操作ではページ移動しない
    swipeEligible = false;
  }
  
  pointers.set(event.pointerId, event);

  try {
    imageStage.setPointerCapture(event.pointerId);
  } catch (error) {
    // Ignore
  }

  if (pointers.size === 1) {
    dragging = true;

    dragStartX = event.clientX;
    dragStartY = event.clientY;

    dragStartTranslateX = translateX;
    dragStartTranslateY = translateY;
  }

  if (pointers.size === 2) {
    const values =
      Array.from(pointers.values());

    pinchStartDistance =
      distanceBetween(values[0], values[1]);

    pinchStartScale = scale;

    const center =
      midpoint(values[0], values[1]);

    pinchStartCenterX = center.x;
    pinchStartCenterY = center.y;

    dragging = false;
  }
}

function handlePointerMove(event) {
  if (!pointers.has(event.pointerId)) {
    return;
  }

  pointers.set(event.pointerId, event);

  if (pointers.size === 2) {
    const values =
      Array.from(pointers.values());

    const distance =
      distanceBetween(values[0], values[1]);

    if (pinchStartDistance > 0) {
      setScale(
        pinchStartScale *
          (distance / pinchStartDistance),
        pinchStartCenterX,
        pinchStartCenterY
      );
    }

    return;
  }

  if (
    pointers.size === 1 &&
    dragging &&
    scale > fitScale
  ) {
    const dx =
      event.clientX - dragStartX;

    const dy =
      event.clientY - dragStartY;

    translateX =
      dragStartTranslateX + dx;

    translateY =
      dragStartTranslateY + dy;

    clampTranslation();
    applyTransform();
  }
}


function handlePointerEnd(event) {
  pointers.delete(event.pointerId);

  if (pointers.size === 0) {
    dragging = false;

    const swipeDeltaX =
      event.clientX - swipeStartX;

    const swipeDeltaY =
      event.clientY - swipeStartY;

    const isSwipe =
      swipeEligible &&
      swipeStartScale <= fitScale * 1.05 &&
      Math.abs(swipeDeltaX) >= 60 &&
      Math.abs(swipeDeltaX) >
        Math.abs(swipeDeltaY) * 1.3;

    swipeEligible = false;

    if (isSwipe) {
      // 左スワイプ：次のページ
      // 右スワイプ：前のページ
      navigatePage(swipeDeltaX < 0 ? 1 : -1);
      lastTapTime = 0;
      return;
    }

    const moved =
      Math.hypot(
        event.clientX - dragStartX,
        event.clientY - dragStartY
      ) > TAP_MOVE_THRESHOLD;

    if (!moved) {
      const now = performance.now();

      if (
        now - lastTapTime <= DOUBLE_TAP_TIME &&
        Math.hypot(
          event.clientX - lastTapX,
          event.clientY - lastTapY
        ) <= DOUBLE_TAP_DISTANCE
      ) {
        toggleDoubleTapZoom(
          event.clientX,
          event.clientY
        );

        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = event.clientX;
        lastTapY = event.clientY;
      }
    }
  }
}

function formatTime(seconds) {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "0:00";
  }

  const totalSeconds =
    Math.floor(seconds);

  const minutes =
    Math.floor(totalSeconds / 60);

  const secs =
    totalSeconds % 60;

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}


function updateAudioTime() {
  const current =
    Number.isFinite(audio.currentTime)
      ? audio.currentTime
      : 0;

  const duration =
    Number.isFinite(audio.duration)
      ? audio.duration
      : 0;

  timeDisplay.textContent =
    `${formatTime(current)} / ${formatTime(duration)}`;

  progress.value =
    duration > 0
      ? String(
          Math.round(
            (current / duration) * 1000
          )
        )
      : "0";
}


function seekBy(seconds) {
  if (!Number.isFinite(audio.duration)) {
    return;
  }

  audio.currentTime = Math.min(
    audio.duration,
    Math.max(
      0,
      audio.currentTime + seconds
    )
  );
}


function setAutoPlay(enabled) {
  autoPlayEnabled = enabled;

  autoPlayToggle.textContent =
    enabled ? "自動再生 ON" : "自動再生 OFF";

  autoPlayToggle.setAttribute(
    "aria-pressed",
    String(enabled)
  );

  autoPlayToggle.title =
    enabled ? "自動再生を停止" : "自動再生を開始";
}

async function playCurrentAudio() {
  if (!autoPlayEnabled || !audio.src) {
    return;
  }

  try {
    if (audioContext && audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (autoPlayEnabled) {
      await audio.play();
    }
  } catch (error) {
    console.warn("音声を再生できませんでした:", error);
  }
}


function initializeAudioControls() {
  initializeAudioVolume();

  audio.volume = 1;
  audio.playbackRate = Number(rate.value);

  audio.addEventListener("loadedmetadata", updateAudioTime);
  audio.addEventListener("timeupdate", updateAudioTime);
  audio.addEventListener("durationchange", updateAudioTime);

  playButton.addEventListener("click", async () => {
    try {
      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
      }

      await audio.play();
    } catch (error) {
      console.warn("音声を再生できませんでした:", error);
    }
  });

  pauseButton.addEventListener("click", () => {
    audio.pause();
  });

  back5Button.addEventListener("click", () => {
    seekBy(-5);
  });

  forward5Button.addEventListener("click", () => {
    seekBy(5);
  });

  progress.addEventListener("input", () => {
    if (
      !Number.isFinite(audio.duration) ||
      audio.duration <= 0
    ) {
      return;
    }

    audio.currentTime =
      (Number(progress.value) / 1000) * audio.duration;
  });

  volume.addEventListener("input", () => {
    if (gainNode) {
      gainNode.gain.value = Number(volume.value);
    }
  });

  volume.addEventListener("change", () => {
    if (gainNode) {
      gainNode.gain.value = Number(volume.value);
    }
  });

  rate.addEventListener("change", () => {
    audio.playbackRate = Number(rate.value);
  });

  autoPlayToggle.addEventListener("click", async () => {
    const enabled = !autoPlayEnabled;
    setAutoPlay(enabled);

    if (enabled) {
      const pageData = pages[currentPageIndex];

      if (pageData &&
          (pageData.type === "video" || pageData.video)) {
        try {
          await video.play();
        } catch (error) {
          console.warn("動画を再生できませんでした:", error);
        }
      } else {
        await playCurrentAudio();
      }
    } else {
      audio.pause();
      video.pause();
    }
  });

  // 音声付き画像：音声終了後に次ページへ進む
  audio.addEventListener("ended", () => {
    if (!autoPlayEnabled) {
      return;
    }

    if (currentPageIndex < pages.length - 1) {
      loadPage(currentPageIndex + 1);
    } else {
      // 最終ページの音声が終わったら自動再生を停止
      setAutoPlay(false);
    }
  });

  // 動画：終了後に次ページへ進む（イベント登録は1回だけ）
  video.addEventListener("ended", () => {
    if (!autoPlayEnabled) {
      return;
    }

    if (currentPageIndex < pages.length - 1) {
      const nextIndex = currentPageIndex + 1;

      // iPhoneのネイティブ全画面表示中なら、
      // 先に全画面表示を終了し、終了イベント後に次ページを読み込む
      if (
        video.webkitDisplayingFullscreen &&
        typeof video.webkitExitFullscreen === "function"
      ) {
        pendingIOSFullscreenNextPageIndex = nextIndex;
        resumeAfterIOSFullscreen = false;
        video.webkitExitFullscreen();
        return;
      }

      // 全画面表示でなければ、そのまま次ページへ
      loadPage(nextIndex);
    } else {
      // 最終ページの動画が終わったら自動再生を停止
      setAutoPlay(false);
    }
  });

  setAutoPlay(false);
}


function loadAudioForPage(pageData) {
  const token = ++audioLoadToken;

  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  audio.currentTime = 0;
  progress.value = "0";

const isVideoPage =
  pageData.type === "video" || Boolean(pageData.video);

audioBar.style.display =
  pageData.audio || isVideoPage ? "" : "none";
  if (!pageData.audio) {
    updateAudioTime();
    return;
  }

  const onCanPlay = () => {
    if (token !== audioLoadToken) {
      return;
    }

    if (autoPlayEnabled) {
      playCurrentAudio();
    }
  };

  audio.addEventListener("canplay", onCanPlay, { once: true });

  audio.src = pageData.audio;
  audio.load();

  updateAudioTime();
}

function loadImageForPage(pageData) {
  const viewer = document.getElementById("viewer");

  // ページ切り替え時はいったん操作部を表示状態に戻す。
  if (imageControlsHideTimer !== null) {
    clearTimeout(imageControlsHideTimer);
    imageControlsHideTimer = null;
  }
  viewer.classList.remove("image-controls-hidden");

  // 以前の動画を停止し、動画モードを解除する
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.style.display = "none";

  viewer.classList.remove("video-mode");
  image.style.display = "";

  // タイトルは画像・動画のどちらでも更新する
  title.textContent = pageData.title || "";
  document.title =
    reportTitle || pageData.title || "画像Viewer";

  // 動画ページ
  if (pageData.type === "video" || pageData.video) {
    viewer.classList.add("video-mode");

    image.style.display = "none";
    video.style.display = "block";

    // 動画ページには画像の拡大率を引き継がない
    pointers.clear();
    dragging = false;
    swipeEligible = false;
    scale = INITIAL_SCALE;
    translateX = 0;
    translateY = 0;

    video.src = pageData.video;
    video.load();

    // 動画の再生準備ができてから自動再生する
    video.oncanplay = () => {
      // 読み込み中に別ページへ移動していたら再生しない
      if (pages[currentPageIndex] !== pageData) {
        return;
      }

if (autoPlayEnabled) {
  video.play()
    .then(() => {
      if (reopenIOSFullscreenForNextVideo) {
        reopenIOSFullscreenForNextVideo = false;

        if (typeof video.webkitEnterFullscreen === "function") {
          video.webkitEnterFullscreen();
        }
      }
    })
    .catch((error) => {
      reopenIOSFullscreenForNextVideo = false;

      console.warn(
        "動画の自動再生に失敗しました:",
        error
      );
    });
}
    };

    return; 
  }

  // 画像ページ：スマートフォン横向きでは操作部を隠す
  if (shouldAutoHideImageControls()) {
    hideImageControlsForLandscape();
  }

  if (!pageData.image) {
    image.style.display = "none";
    return;
  }

  const preload = new Image();

  preload.onload = () => {
    // 読み込み中に別ページへ移動していたら処理しない
    if (pages[currentPageIndex] !== pageData) {
      return;
    }

    imageNaturalWidth = preload.naturalWidth;
    imageNaturalHeight = preload.naturalHeight;

    image.src = pageData.image;
    image.alt = pageData.title || "";

    requestAnimationFrame(resetView);
  };

  preload.onerror = () => {
    if (pages[currentPageIndex] === pageData) {
      image.alt = "画像を読み込めませんでした";
    }
  };

  preload.src = pageData.image;
}

function updateTableOfContents() {
  console.log("updateTableOfContents が実行されました");

  const tableOfContents =
    document.getElementById("tableOfContents");

  if (!tableOfContents) {
    return;
  }

  tableOfContents.innerHTML = "";

  pages.forEach((pageData, index) => {
    const item = document.createElement("button");

    item.type = "button";
    item.className = "tocItem";

    if (index === currentPageIndex) {
      item.classList.add("current");
    }

    // 動画ページかどうかを判定
    const isVideo =
      pageData.type === "video" || !!pageData.video;

    // 音声付き画像かどうかを判定
    const hasAudio =
      !isVideo && !!pageData.audio;

    // サムネイルを囲む要素
    const thumbnailContainer =
      document.createElement("div");

    thumbnailContainer.className =
      "tocThumbnailContainer";

    let thumbnail;

    if (isVideo) {
      thumbnailContainer.classList.add("hasVideo");

      if (pageData.thumbnail) {
        // 動画サムネイル画像を表示
        thumbnail = document.createElement("img");
        thumbnail.src = pageData.thumbnail;
        thumbnail.dataset.thumbnailUrl = pageData.thumbnail;
        thumbnail.alt = (pageData.title || "") + "（動画）";

        console.log(
          "動画サムネイルURL:",
          pageData.thumbnail
        );

        thumbnailContainer.appendChild(thumbnail);
      }

      // 動画マークを中央に重ねる
      const videoIcon = document.createElement("span");
      videoIcon.className = "tocVideoIcon";
      videoIcon.textContent = "▶";
      videoIcon.setAttribute("aria-label", "動画");
      videoIcon.setAttribute("aria-hidden", "false");

      thumbnailContainer.appendChild(videoIcon);

    } else {
      // 通常の画像、または音声付き画像
      thumbnail = document.createElement("img");
      thumbnail.src =
        pageData.thumbnail || pageData.image || "";
      thumbnail.alt = pageData.title || "";

      thumbnailContainer.appendChild(thumbnail);

      if (hasAudio) {
        thumbnailContainer.classList.add("hasAudio");

        // スピーカーマークを右下に重ねる
        const audioIcon = document.createElement("span");
        audioIcon.className = "tocAudioIcon";
        audioIcon.textContent = "🔊";
        audioIcon.setAttribute("aria-label", "音声付き画像");

        thumbnailContainer.appendChild(audioIcon);
      }
    }

    // ページタイトル
    const itemTitle = document.createElement("span");

    itemTitle.textContent =
      `${pageData.page}. ${pageData.title}`;

    item.appendChild(thumbnailContainer);
    item.appendChild(itemTitle);

    // 既存のページ切り替え処理を維持
    item.addEventListener("click", () => {
      loadPage(index);
      tableOfContents.style.display = "none";
    });

    tableOfContents.appendChild(item);
  });
}

function loadPage(index) {
  if (
    index < 0 ||
    index >= pages.length
  ) {
    return;
  }

  currentPageIndex = index;

  const pageData =
    pages[currentPageIndex];

  currentPage =
    currentPageIndex + 1;

  pageIndicator.textContent =
    `${currentPage} / ${pages.length}`;

  updateTableOfContents();

  prevPageButton.disabled =
    false;

  nextPageButton.disabled =
    false;

  prevPageButton.setAttribute(
    "aria-disabled",
    currentPageIndex === 0
  );

  nextPageButton.setAttribute(
    "aria-disabled",
    currentPageIndex === pages.length - 1
  );
  
  loadImageForPage(
    pageData
  );

  loadAudioForPage(
    pageData
  );

}

async function initializeReport() {
  try {
    if (!reportDataUrl) {
      throw new Error(
        "JSONファイルのURLが指定されていません。"
      );
    }
    
    const response = await fetch(reportDataUrl);

    if (!response.ok) {
      throw new Error(
        `JSONの読み込みに失敗しました: ${response.status}`
      );
    }

    const reportData = await response.json();

    if (
      !Array.isArray(reportData.pages) ||
      reportData.pages.length === 0
    ) {
      throw new Error("ページデータがありません");
    }

    pages = reportData.pages;
    reportTitle = reportData.title || "";

    currentPage = Math.min(
      pages.length,
      Math.max(
        1,
        Number(params.get("page")) || 1
      )
    );

    currentPageIndex = currentPage - 1;

    loadPage(currentPageIndex);

  } catch (error) {
    console.error("報告書の読み込みエラー:", error);

    title.textContent =
      "報告書データを読み込めませんでした";

    document.title = "報告書の読み込みエラー";
    pageIndicator.textContent = "データ読込エラー";
  }
}

let lastPageNavigationTime = 0;

function navigatePage(direction) {
  const targetIndex =
    currentPageIndex + direction;

  // ページ範囲外への移動は無視する
  if (
    targetIndex < 0 ||
    targetIndex >= pages.length
  ) {
    return;
  }

  const now = performance.now();

  // 短時間の連続タップは1回だけ処理する
  if (now - lastPageNavigationTime < 400) {
    return;
  }

  lastPageNavigationTime = now;

  loadPage(targetIndex);
}

prevPageButton.addEventListener(
  "click",
  () => {
    navigatePage(-1);
  }
);

nextPageButton.addEventListener(
  "click",
  () => {
    navigatePage(1);
  }
);

// 動画ページ用の左右スワイプ処理
const viewer = document.getElementById("viewer");

let videoSwipeStartX = 0;
let videoSwipeStartY = 0;
let videoSwipeActive = false;

viewer.addEventListener("pointerdown", (event) => {
  if (!viewer.classList.contains("video-mode")) return;
  if (event.target.closest("#pageNavigation")) return;
  if (event.target.closest("#audioBar")) return;
  if (event.target.closest("#videoFullscreenButton")) return;

  videoSwipeStartX = event.clientX;
  videoSwipeStartY = event.clientY;
  videoSwipeActive = true;
});

viewer.addEventListener("pointerup", (event) => {
  if (!videoSwipeActive) return;
  videoSwipeActive = false;

  const dx = event.clientX - videoSwipeStartX;
  const dy = event.clientY - videoSwipeStartY;

  if (
    Math.abs(dx) >= 60 &&
    Math.abs(dx) > Math.abs(dy) * 1.3
  ) {
    navigatePage(dx < 0 ? 1 : -1);
  }
});

viewer.addEventListener("pointercancel", () => {
  videoSwipeActive = false;
});

// ページナビゲーション全体で
// ダブルクリック／ダブルタップによるブラウザ拡大を防止
pageNavigation.addEventListener(
  "dblclick",
  (event) => {
    event.preventDefault();
  }
);

nextPageButton.addEventListener(
  "dblclick",
  (event) => {
    event.preventDefault();
  }
  
);zoomInButton.addEventListener(
  "click",
  zoomIn
);

zoomOutButton.addEventListener(
  "click",
  zoomOut
);

resetViewButton.addEventListener(
  "click",
  resetView
);

tocButton.addEventListener(
  "click",
  () => {
    const tableOfContents =
      document.getElementById("tableOfContents");

    if (
      tableOfContents.style.display === "block"
    ) {
      tableOfContents.style.display = "none";
    } else {
      updateTableOfContents();
      tableOfContents.style.display = "block";
    }
  }
);

imageStage.addEventListener("click", (event) => {
  // 画像をタップしたら操作部を5秒間表示する。
  showImageControlsTemporarily();

  const tableOfContents =
    document.getElementById("tableOfContents");

  if (tableOfContents.style.display !== "block") {
    return;
  }

  // 目次パネル内のクリックは対象外
  if (tableOfContents.contains(event.target)) {
    return;
  }

  // 操作ボタンのクリックも対象外
  if (event.target.closest("#imageControls")) {
    return;
  }

  tableOfContents.style.display = "none";
});

// 操作ガイドを開く
helpButton.addEventListener("click", () => {
  helpOverlay.style.display = "flex";
  helpClose.focus();
});

// 閉じるボタンでガイドを閉じる
helpClose.addEventListener("click", () => {
  helpOverlay.style.display = "none";
  helpButton.focus();
});

// ガイドの背景部分をクリックして閉じる
helpOverlay.addEventListener("click", (event) => {
  if (event.target === helpOverlay) {
    helpOverlay.style.display = "none";
    helpButton.focus();
  }
});

// Escapeキーでも閉じる
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    helpOverlay.style.display === "flex"
  ) {
    helpOverlay.style.display = "none";
    helpButton.focus();
  }
});

closeButton.addEventListener(
  "click",
  () => {
    try {
      window.close();
    } catch (error) {
      // Ignore
    }
  }
);


imageStage.addEventListener(
  "pointerdown",
  handlePointerDown
);

imageStage.addEventListener(
  "pointermove",
  handlePointerMove
);

imageStage.addEventListener(
  "pointerup",
  handlePointerEnd
);

imageStage.addEventListener(
  "pointercancel",
  handlePointerEnd
);


imageStage.addEventListener(
  "wheel",
  (event) => {
    // 動画ページでは、画像のズーム処理を行わない
    if (
      document.getElementById("viewer").classList.contains("video-mode")
    ) {
      return;
    }

    event.preventDefault();

    const rect =
      imageStage.getBoundingClientRect();

    const x =
      event.clientX - rect.left;

    const y =
      event.clientY - rect.top;

    setScale(
      scale *
        (
          event.deltaY < 0
            ? ZOOM_STEP
            : 1 / ZOOM_STEP
        ),
      x,
      y
    );
  },
  { passive: false }
);

window.addEventListener(
  "resize",
  () => {
    const oldFitScale =
      fitScale;

    fitScale =
      calculateFitScale();

    if (
      oldFitScale > 0 &&
      Math.abs(
        fitScale - oldFitScale
      ) > 0.001 &&
      scale <= oldFitScale * 1.05
    ) {
      resetView();
    } else {
      clampTranslation();
      applyTransform();
    }
  }
);


initializeAudioControls();

initializeReport();
