"use strict";


/* ========================================
   URLパラメータ
======================================== */

const params = new URLSearchParams(window.location.search);

const imageURL = params.get("image") || "";
const imageTitle = params.get("title") || "";
const audioURL = params.get("audio") || "";


/* ========================================
   DOM
======================================== */

const image = document.getElementById("image");
const imageArea = document.getElementById("imageArea");
const imageStage = document.getElementById("imageStage");
const title = document.getElementById("title");

const zoomOutButton = document.getElementById("zoomOut");
const zoomInButton = document.getElementById("zoomIn");
const resetButton = document.getElementById("reset");
const closeButton = document.getElementById("close");

const audio = document.getElementById("audio");

const playButton = document.getElementById("play");
const pauseButton = document.getElementById("pause");
const back5Button = document.getElementById("back5");
const forward5Button = document.getElementById("forward5");

const progress = document.getElementById("progress");

const currentTimeText = document.getElementById("currentTime");
const durationText = document.getElementById("duration");

const volume = document.getElementById("volume");
const rate = document.getElementById("rate");


/* ========================================
   画像表示
======================================== */

if (imageTitle) {
    title.textContent = imageTitle;
} else {
    title.style.display = "none";
}


if (imageURL) {
    image.src = imageURL;
}


/* ========================================
   音声
======================================== */

if (audioURL) {
    audio.src = audioURL;
} else {
    document.getElementById("audioPanel").style.display = "none";
}


/* ========================================
   画像ズーム設定
======================================== */

const INITIAL_SCALE = 0.90;

/*
 * ここを小さくすることで、
 * 初期表示よりさらに縮小できます。
 */
const MIN_SCALE = 0.10;

const MAX_SCALE = 5.00;

const ZOOM_STEP = 1.20;

const DOUBLE_TAP_SCALE = 2.00;

const DOUBLE_TAP_TIME = 350;

const DOUBLE_TAP_DISTANCE = 30;

const TAP_MOVE_THRESHOLD = 12;


/* ========================================
   画像状態
======================================== */

let fitScale = 1;

let scale = INITIAL_SCALE;

let translateX = 0;
let translateY = 0;


/* ========================================
   viewport取得
======================================== */

function getViewportSize() {

    let width = imageStage.clientWidth;
    let height = imageStage.clientHeight;

    if (
        window.visualViewport &&
        window.visualViewport.width > 0 &&
        window.visualViewport.height > 0
    ) {
        width = imageStage.clientWidth;
        height = imageStage.clientHeight;
    }

    return {
        width,
        height
    };
}


/* ========================================
   Fit Scale
======================================== */

function calculateFitScale() {

    const viewport = getViewportSize();

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    if (
        viewportWidth <= 0 ||
        viewportHeight <= 0 ||
        !image.naturalWidth ||
        !image.naturalHeight
    ) {
        return 1;
    }

    const scaleX = viewportWidth / image.naturalWidth;
    const scaleY = viewportHeight / image.naturalHeight;

    return Math.min(scaleX, scaleY);
}


/* ========================================
   画像サイズ取得
======================================== */

function getScaledImageSize() {

    return {
        width: image.naturalWidth * scale,
        height: image.naturalHeight * scale
    };
}


/* ========================================
   移動範囲制限
======================================== */

function clampTranslation() {

    const viewport = getViewportSize();

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    const size = getScaledImageSize();

    const imageWidth = size.width;
    const imageHeight = size.height;


    /*
     * 横方向
     */

    if (imageWidth <= viewportWidth) {

        translateX = (viewportWidth - imageWidth) / 2;

    } else {

        const minX = viewportWidth - imageWidth;

        const maxX = 0;

        translateX = Math.min(
            maxX,
            Math.max(minX, translateX)
        );
    }


    /*
     * 縦方向
     */

    if (imageHeight <= viewportHeight) {

        translateY = (viewportHeight - imageHeight) / 2;

    } else {

        const minY = viewportHeight - imageHeight;

        const maxY = 0;

        translateY = Math.min(
            maxY,
            Math.max(minY, translateY)
        );
    }
}


/* ========================================
   Transform
======================================== */

function applyTransform() {

    clampTranslation();

    image.style.transform =
        `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}


/* ========================================
   初期表示
======================================== */

function resetView() {

    fitScale = calculateFitScale();

    scale = fitScale * INITIAL_SCALE;

    /*
     * 極端に小さい画像などの場合の保護
     */
    scale = Math.max(MIN_SCALE, scale);

    translateX = 0;
    translateY = 0;

    applyTransform();
}


/* ========================================
   画像読み込み
======================================== */

image.addEventListener("load", () => {

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            resetView();

        });

    });

});


/* ========================================
   ウィンドウサイズ変更
======================================== */

window.addEventListener("resize", () => {

    if (!image.naturalWidth) {
        return;
    }

    applyTransform();

});


if (window.visualViewport) {

    window.visualViewport.addEventListener(
        "resize",
        () => {

            if (!image.naturalWidth) {
                return;
            }

            applyTransform();

        }
    );

}


/* ========================================
   ズーム
======================================== */

function zoomTo(newScale, centerX, centerY) {

    newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, newScale)
    );


    /*
     * 指定位置を中心にズームする
     */

    const oldScale = scale;

    const ratio = newScale / oldScale;


    if (
        Number.isFinite(centerX) &&
        Number.isFinite(centerY)
    ) {

        translateX =
            centerX -
            (centerX - translateX) * ratio;

        translateY =
            centerY -
            (centerY - translateY) * ratio;

    }


    scale = newScale;

    applyTransform();
}


function zoomIn() {

    const viewport = getViewportSize();

    zoomTo(
        scale * ZOOM_STEP,
        viewport.width / 2,
        viewport.height / 2
    );
}


function zoomOut() {

    const viewport = getViewportSize();

    zoomTo(
        scale / ZOOM_STEP,
        viewport.width / 2,
        viewport.height / 2
    );
}


zoomInButton.addEventListener("click", zoomIn);

zoomOutButton.addEventListener("click", zoomOut);

resetButton.addEventListener("click", resetView);


/* ========================================
   マウスホイール
======================================== */

imageStage.addEventListener(
    "wheel",
    (event) => {

        event.preventDefault();


        const rect = imageStage.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;


        if (event.deltaY < 0) {

            zoomTo(
                scale * ZOOM_STEP,
                x,
                y
            );

        } else {

            zoomTo(
                scale / ZOOM_STEP,
                x,
                y
            );

        }

    },
    {
        passive: false
    }
);


/* ========================================
   Pointer操作
======================================== */

const pointers = new Map();

let dragStartX = 0;
let dragStartY = 0;

let startTranslateX = 0;
let startTranslateY = 0;

let pinchStartDistance = 0;
let pinchStartScale = 1;

let lastTapTime = 0;

let lastTapX = 0;
let lastTapY = 0;

let moved = false;


function getPointerDistance() {

    const points = [...pointers.values()];

    if (points.length < 2) {
        return 0;
    }

    const dx =
        points[0].x -
        points[1].x;

    const dy =
        points[0].y -
        points[1].y;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


imageStage.addEventListener(
    "pointerdown",
    (event) => {

        pointers.set(
            event.pointerId,
            {
                x: event.clientX,
                y: event.clientY
            }
        );

        image.setPointerCapture(event.pointerId);

        moved = false;


        /*
         * ピンチ開始
         */

        if (pointers.size === 2) {

            pinchStartDistance =
                getPointerDistance();

            pinchStartScale =
                scale;

            return;
        }


        /*
         * ドラッグ開始
         */

        if (pointers.size === 1) {

            dragStartX = event.clientX;
            dragStartY = event.clientY;

            startTranslateX = translateX;
            startTranslateY = translateY;

            image.classList.add("dragging");
        }

    }
);


imageStage.addEventListener(
    "pointermove",
    (event) => {

        if (!pointers.has(event.pointerId)) {
            return;
        }


        pointers.set(
            event.pointerId,
            {
                x: event.clientX,
                y: event.clientY
            }
        );


        /*
         * ピンチズーム
         */

        if (pointers.size === 2) {

            const distance =
                getPointerDistance();

            if (pinchStartDistance <= 0) {
                return;
            }

            const newScale =
                pinchStartScale *
                (distance / pinchStartDistance);

            zoomTo(
                newScale,
                imageStage.clientWidth / 2,
                imageStage.clientHeight / 2
            );

            moved = true;

            return;
        }


        /*
         * 1本指ドラッグ
         */

        if (pointers.size === 1) {

            const dx =
                event.clientX - dragStartX;

            const dy =
                event.clientY - dragStartY;


            if (
                Math.abs(dx) > TAP_MOVE_THRESHOLD ||
                Math.abs(dy) > TAP_MOVE_THRESHOLD
            ) {
                moved = true;
            }


            /*
             * 画像が画面より大きいときだけ
             * ドラッグする
             */

            translateX =
                startTranslateX + dx;

            translateY =
                startTranslateY + dy;

            applyTransform();
        }

    }
);


function handlePointerEnd(event) {

    pointers.delete(event.pointerId);

    image.classList.remove("dragging");


    /*
     * ピンチ終了後
     */

    if (pointers.size === 1) {

        const remaining =
            [...pointers.values()][0];

        dragStartX = remaining.x;
        dragStartY = remaining.y;

        startTranslateX = translateX;
        startTranslateY = translateY;
    }

}


/* ========================================
   ダブルタップ
======================================== */

imageStage.addEventListener(
    "pointerup",
    (event) => {

        handlePointerEnd(event);


        if (moved) {
            return;
        }


        const now = Date.now();

        const dx =
            event.clientX - lastTapX;

        const dy =
            event.clientY - lastTapY;

        const distance =
            Math.sqrt(dx * dx + dy * dy);


        if (
            now - lastTapTime <= DOUBLE_TAP_TIME &&
            distance <= DOUBLE_TAP_DISTANCE
        ) {

            const rect =
                imageStage.getBoundingClientRect();

            const x =
                event.clientX - rect.left;

            const y =
                event.clientY - rect.top;


            if (
                Math.abs(scale - fitScale * INITIAL_SCALE) <
                0.05
            ) {

                zoomTo(
                    Math.min(
                        MAX_SCALE,
                        fitScale * DOUBLE_TAP_SCALE
                    ),
                    x,
                    y
                );

            } else {

                resetView();

            }


            lastTapTime = 0;

        } else {

            lastTapTime = now;

            lastTapX = event.clientX;
            lastTapY = event.clientY;
        }

    }
);


/* ========================================
   音声：時間表示
======================================== */

function formatTime(seconds) {

    if (!Number.isFinite(seconds)) {
        return "0:00";
    }

    const minutes =
        Math.floor(seconds / 60);

    const secs =
        Math.floor(seconds % 60);

    return (
        minutes +
        ":" +
        String(secs).padStart(2, "0")
    );
}


/* ========================================
   音声：メタデータ読み込み
======================================== */

audio.addEventListener(
    "loadedmetadata",
    () => {

        durationText.textContent =
            formatTime(audio.duration);

        progress.max =
            audio.duration;

        progress.value =
            audio.currentTime;

    }
);


/* ========================================
   音声：再生位置更新
======================================== */

audio.addEventListener(
    "timeupdate",
    () => {

        currentTimeText.textContent =
            formatTime(audio.currentTime);

        progress.value =
            audio.currentTime;

    }
);


/* ========================================
   音声：再生
======================================== */

playButton.addEventListener(
    "click",
    () => {

        audio.play().catch(() => {});

    }
);


/* ========================================
   音声：一時停止
======================================== */

pauseButton.addEventListener(
    "click",
    () => {

        audio.pause();

    }
);


/* ========================================
   音声：5秒戻る
======================================== */

back5Button.addEventListener(
    "click",
    () => {

        audio.currentTime =
            Math.max(
                0,
                audio.currentTime - 5
            );

    }
);


/* ========================================
   音声：5秒進む
======================================== */

forward5Button.addEventListener(
    "click",
    () => {

        audio.currentTime =
            Math.min(
                audio.duration || 0,
                audio.currentTime + 5
            );

    }
);


/* ========================================
   音声：スライダー
======================================== */

progress.addEventListener(
    "input",
    () => {

        audio.currentTime =
            Number(progress.value);

    }
);


/* ========================================
   音量
======================================== */

volume.addEventListener(
    "input",
    () => {

        audio.volume =
            Number(volume.value);

    }
);


/* ========================================
   再生速度
======================================== */

rate.addEventListener(
    "change",
    () => {

        audio.playbackRate =
            Number(rate.value);

    }
);


/* ========================================
   再生終了
======================================== */

audio.addEventListener(
    "ended",
    () => {

        progress.value = 0;

        currentTimeText.textContent =
            "0:00";

    }
);


/* ========================================
   閉じる
======================================== */

closeButton.addEventListener(
    "click",
    () => {

        try {

            window.close();

        } catch (error) {

            // ブラウザによってwindow.close()が
            // 禁止される場合があります。

        }

    }
);


/* ========================================
   初期設定
======================================== */

audio.volume = 1;

audio.playbackRate = 1;
