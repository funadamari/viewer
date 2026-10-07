const params = new URLSearchParams(window.location.search);

const pages = [
  {
    page: 1,
    title: "1ページ目",
    image: "https://funadamari.github.io/env/images/perished_fish_sl-1.jpg",
    audio: "https://funadamari.github.io/env/audio/perished_fish_sl-1.mp3"
  },
  {
    page: 2,
    title: "2ページ目",
    image: "https://funadamari.github.io/env/images/perished_fish_sl-2.jpg",
    audio: "https://funadamari.github.io/env/audio/perished_fish_sl-2.mp3"
  },
  {
    page: 3,
    title: "3ページ目",
    image: "https://funadamari.github.io/env/images/perished_fish_sl-3.jpg",
    audio: "https://funadamari.github.io/env/audio/perished_fish_sl-3.mp3"
  },
  {
    page: 4,
    title: "4ページ目",
    image: "https://funadamari.github.io/env/images/perished_fish_sl-4.jpg",
    audio: "https://funadamari.github.io/env/audio/perished_fish_sl-4.mp3"
  },
  {
    page: 5,
    title: "5ページ目",
    image: "https://funadamari.github.io/env/images/perished_fish_sl-5.jpg",
    audio: "https://funadamari.github.io/env/audio/perished_fish_sl-5.mp3"
  },
  {
    page: 6,
    title: "6ページ目",
    image: "https://funadamari.github.io/env/images/perished_fish_sl-6.jpg",
    audio: "https://funadamari.github.io/env/audio/perished_fish_sl-6.mp3"
  }
];

let currentPage =
  Math.min(
    pages.length,
    Math.max(
      1,
      Number(params.get("page")) || 1
    )
  );

let currentPageIndex = currentPage - 1;

const image = document.getElementById("image");
const title = document.getElementById("title");
const imageStage = document.getElementById("imageStage");

const zoomInButton = document.getElementById("zoomIn");
const zoomOutButton = document.getElementById("zoomOut");
const resetViewButton = document.getElementById("resetView");
const closeButton = document.getElementById("closeButton");

const prevPageButton = document.getElementById("prevPage");
const nextPageButton = document.getElementById("nextPage");
const pageIndicator = document.getElementById("pageIndicator");

const audioBar = document.getElementById("audioBar");
const audio = document.getElementById("audio");
const back5Button = document.getElementById("back5");
const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const forward5Button = document.getElementById("forward5");
const progress = document.getElementById("progress");
const timeDisplay = document.getElementById("time");
const volume = document.getElementById("volume");
const rate = document.getElementById("rate");

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


function handlePointerDown(event) {
  // 画像コントロール上の操作は、
  // 画像のドラッグ／ピンチ処理から除外する。
  if (event.target.closest("#imageControls")) {
    return;
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


function initializeAudioControls() {
  const audioURL = currentPageData.audio;


  audio.volume =
    Number(volume.value);

  audio.playbackRate =
    Number(rate.value);

  audio.addEventListener(
    "loadedmetadata",
    updateAudioTime
  );

  audio.addEventListener(
    "timeupdate",
    updateAudioTime
  );

  audio.addEventListener(
    "durationchange",
    updateAudioTime
  );

  playButton.addEventListener(
    "click",
    () => {
      audio.play().catch(() => {});
    }
  );

  pauseButton.addEventListener(
    "click",
    () => {
      audio.pause();
    }
  );

  back5Button.addEventListener(
    "click",
    () => {
      seekBy(-5);
    }
  );

  forward5Button.addEventListener(
    "click",
    () => {
      seekBy(5);
    }
  );

  progress.addEventListener(
    "input",
    () => {
      if (
        !Number.isFinite(audio.duration) ||
        audio.duration <= 0
      ) {
        return;
      }

      audio.currentTime =
        (Number(progress.value) / 1000) *
        audio.duration;
    }
  );

  volume.addEventListener(
    "input",
    () => {
      audio.volume =
        Number(volume.value);
    }
  );

  rate.addEventListener(
    "change",
    () => {
      audio.playbackRate =
        Number(rate.value);
    }
  );
}

function loadAudioForPage(pageData) {
  audio.pause();

  audio.currentTime = 0;

  progress.value = "0";

  audio.src = pageData.audio;

  audio.load();

  audioBar.style.display =
    pageData.audio ? "flex" : "none";

  updateAudioTime();
}

function loadImageForPage(pageData) {
  if (!pageData.image) {
    return;
  }

  const preload = new Image();

  preload.onload = () => {
    imageNaturalWidth =
      preload.naturalWidth;

    imageNaturalHeight =
      preload.naturalHeight;

    image.src =
      pageData.image;

    image.alt =
      pageData.title;

    title.textContent =
      pageData.title;

    document.title =
      pageData.title || "画像Viewer";

    requestAnimationFrame(
      resetView
    );
  };

  preload.onerror = () => {
    image.alt =
      "画像を読み込めませんでした";
  };

  preload.src =
    pageData.image;
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

  prevPageButton.disabled =
    currentPageIndex === 0;

  nextPageButton.disabled =
    currentPageIndex === pages.length - 1;

  loadImageForPage(
    pageData
  );

  loadAudioForPage(
    pageData
  );
}

prevPageButton.addEventListener(
  "click",
  () => {
    loadPage(
      currentPageIndex - 1
    );
  }
);

nextPageButton.addEventListener(
  "click",
  () => {
    loadPage(
      currentPageIndex + 1
    );
  }
);

zoomInButton.addEventListener(
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


title.textContent =
  currentPageData.title;

document.title =
  currentPageData.title || "画像Viewer";


initializeAudioControls();

loadPage(
  currentPageIndex
);
