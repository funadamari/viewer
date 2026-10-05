"use strict";

/*
 * ふなだまり 次期Viewer 試作版
 *
 * 機能
 * ・1枚の画像表示
 * ・画像の拡大／縮小
 * ・ドラッグ移動
 * ・PCのマウスホイールズーム
 * ・スマートフォンのピンチズーム
 * ・PCのダブルクリック／スマートフォンのダブルタップ
 * ・初期表示 90%
 * ・画像位置のリセット
 * ・説明文表示
 * ・Web Speech APIによる音声読み上げ
 * ・音声の選択
 * ・読み上げ速度変更
 *
 * URLパラメータ
 *
 * ?image=画像URL
 * &title=タイトル
 * &text=説明文
 *
 * 例：
 * viewer.html?image=https%3A%2F%2Fexample.com%2Ftest.jpg
 * &title=斃死魚等の数と水温、気温の関係
 * &text=ここに説明文を入れます。
 */


/* =========================================================
   DOM要素
   ========================================================= */

const viewer = document.getElementById("viewer");
const image = document.getElementById("image");
const title = document.getElementById("title");

const speechText = document.getElementById("speechText");

const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const stopButton = document.getElementById("stopButton");

const voiceSelect = document.getElementById("voiceSelect");

const rateSlider = document.getElementById("rateSlider");
const rateValue = document.getElementById("rateValue");

const zoomOutButton = document.getElementById("zoomOut");
const resetButton = document.getElementById("reset");
const zoomInButton = document.getElementById("zoomIn");
const closeButton = document.getElementById("close");


/* =========================================================
   URLパラメータ
   ========================================================= */

const params = new URLSearchParams(window.location.search);

const imageURL = params.get("image") || "";
const imageTitle = params.get("title") || "";
const explanationText = params.get("text") || "";


/* =========================================================
   初期設定
   ========================================================= */

const INITIAL_SCALE = 0.90;

const MIN_SCALE = 0.40;
const MAX_SCALE = 5.00;

const ZOOM_STEP = 1.20;

const DOUBLE_TAP_SCALE = 2.00;

const DOUBLE_TAP_TIME = 350;
const DOUBLE_TAP_DISTANCE = 30;

const TAP_MOVE_THRESHOLD = 12;


/* =========================================================
   画像表示状態
   ========================================================= */

let fitScale = 1;

let scale = INITIAL_SCALE;

let translateX = 0;
let translateY = 0;


/* =========================================================
   ポインター操作用状態
   ========================================================= */

const pointers = new Map();

let isDragging = false;

let dragStartX = 0;
let dragStartY = 0;

let dragStartTranslateX = 0;
let dragStartTranslateY = 0;

let pinchStartDistance = 0;
let pinchStartScale = 1;

let pinchCenterX = 0;
let pinchCenterY = 0;


/* =========================================================
   ダブルタップ判定用
   ========================================================= */

let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;


/* =========================================================
   音声読み上げ用
   ========================================================= */

let voices = [];

let speechUtterance = null;


/* =========================================================
   ページタイトル
   ========================================================= */

if (imageTitle) {
    title.textContent = imageTitle;
} else {
    title.textContent = "";
}


/* =========================================================
   説明文
   ========================================================= */

if (explanationText) {
    speechText.textContent = explanationText;
} else {
    speechText.textContent = "説明文はありません。";
}


/* =========================================================
   画像読み込み
   ========================================================= */

function loadImage() {
    if (!imageURL) {
        console.warn("画像URLが指定されていません。");
        return;
    }

    const preloader = new Image();

    preloader.onload = function () {
        image.src = imageURL;

        image.style.display = "block";

        requestAnimationFrame(function () {
            resetView();
        });
    };

    preloader.onerror = function () {
        console.error("画像を読み込めませんでした:", imageURL);
    };

    preloader.src = imageURL;
}


/* =========================================================
   表示領域の取得
   ========================================================= */

function getViewportSize() {
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;

    /*
     * visualViewportが利用可能で、
     * 有効なサイズが取得できる場合はこちらを使用する。
     *
     * ただし、ページ表示直後などに0になる場合があるため、
     * 0の場合はinnerWidth / innerHeightを使用する。
     */

    if (
        window.visualViewport &&
        window.visualViewport.width > 0 &&
        window.visualViewport.height > 0
    ) {
        viewportWidth = window.visualViewport.width;
        viewportHeight = window.visualViewport.height;
    }

    if (viewportWidth <= 0 || viewportHeight <= 0) {
        viewportWidth = 1;
        viewportHeight = 1;
    }

    return {
        width: viewportWidth,
        height: viewportHeight,
    };
}


/* =========================================================
   初期フィット倍率の計算
   ========================================================= */

function calculateFitScale() {
    const viewport = getViewportSize();

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;

    if (
        imageWidth <= 0 ||
        imageHeight <= 0 ||
        viewportWidth <= 0 ||
        viewportHeight <= 0
    ) {
        return 1;
    }

    const widthScale = viewportWidth / imageWidth;
    const heightScale = viewportHeight / imageHeight;

    return Math.min(widthScale, heightScale);
}


/* =========================================================
   画像位置の制限
   ========================================================= */

function clampTranslation() {
    const viewport = getViewportSize();

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;

    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;

    /*
     * 画像が画面より小さい場合は中央配置
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


/* =========================================================
   画像変形の適用
   ========================================================= */

function applyTransform() {
    clampTranslation();

    image.style.transform =
        "translate(" +
        translateX +
        "px, " +
        translateY +
        "px) scale(" +
        scale +
        ")";
}


/* =========================================================
   表示状態のリセット
   ========================================================= */

function resetView() {
    fitScale = calculateFitScale();

    /*
     * 初期表示は画面いっぱいに収まる倍率の90%
     */

    scale = fitScale * INITIAL_SCALE;

    /*
     * 極端に小さくならないようにする
     */

    if (scale < MIN_SCALE) {
        scale = MIN_SCALE;
    }

    if (scale > MAX_SCALE) {
        scale = MAX_SCALE;
    }

    translateX = 0;
    translateY = 0;

    applyTransform();
}


/* =========================================================
   ズーム
   ========================================================= */

function zoomAt(
    newScale,
    centerX,
    centerY
) {
    const oldScale = scale;

    newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, newScale)
    );

    if (newScale === oldScale) {
        return;
    }

    /*
     * 指定した位置を中心にズームする。
     */

    const imageX =
        (centerX - translateX) / oldScale;

    const imageY =
        (centerY - translateY) / oldScale;

    scale = newScale;

    translateX =
        centerX - imageX * scale;

    translateY =
        centerY - imageY * scale;

    applyTransform();
}


/* =========================================================
   ＋ボタン
   ========================================================= */

zoomInButton.addEventListener(
    "click",
    function () {
        const viewport = getViewportSize();

        const centerX = viewport.width / 2;
        const centerY = viewport.height / 2;

        zoomAt(
            scale * ZOOM_STEP,
            centerX,
            centerY
        );
    }
);


/* =========================================================
   −ボタン
   ========================================================= */

zoomOutButton.addEventListener(
    "click",
    function () {
        const viewport = getViewportSize();

        const centerX = viewport.width / 2;
        const centerY = viewport.height / 2;

        zoomAt(
            scale / ZOOM_STEP,
            centerX,
            centerY
        );
    }
);


/* =========================================================
   リセットボタン
   ========================================================= */

resetButton.addEventListener(
    "click",
    function () {
        resetView();
    }
);


/* =========================================================
   マウスホイールズーム
   ========================================================= */

viewer.addEventListener(
    "wheel",
    function (event) {
        event.preventDefault();

        const rect = viewer.getBoundingClientRect();

        const x =
            event.clientX - rect.left;

        const y =
            event.clientY - rect.top;

        if (event.deltaY < 0) {
            zoomAt(
                scale * ZOOM_STEP,
                x,
                y
            );
        } else {
            zoomAt(
                scale / ZOOM_STEP,
                x,
                y
            );
        }
    },
    {
        passive: false,
    }
);


/* =========================================================
   ポインター開始
   ========================================================= */

image.addEventListener(
    "pointerdown",
    function (event) {
        event.preventDefault();

        image.setPointerCapture(event.pointerId);

        pointers.set(
            event.pointerId,
            {
                x: event.clientX,
                y: event.clientY,
            }
        );

        /*
         * 2本指になった場合はピンチズーム開始
         */

        if (pointers.size === 2) {
            const points = Array.from(
                pointers.values()
            );

            pinchStartDistance =
                distance(
                    points[0],
                    points[1]
                );

            pinchStartScale = scale;

            const center =
                midpoint(
                    points[0],
                    points[1]
                );

            pinchCenterX = center.x;
            pinchCenterY = center.y;

            isDragging = false;

            return;
        }

        /*
         * 1本指の場合
         */

        if (pointers.size === 1) {
            isDragging = true;

            dragStartX = event.clientX;
            dragStartY = event.clientY;

            dragStartTranslateX =
                translateX;

            dragStartTranslateY =
                translateY;
        }
    }
);


/* =========================================================
   ポインター移動
   ========================================================= */

image.addEventListener(
    "pointermove",
    function (event) {
        if (!pointers.has(event.pointerId)) {
            return;
        }

        pointers.set(
            event.pointerId,
            {
                x: event.clientX,
                y: event.clientY,
            }
        );

        /*
         * ピンチズーム
         */

        if (pointers.size === 2) {
            const points = Array.from(
                pointers.values()
            );

            const currentDistance =
                distance(
                    points[0],
                    points[1]
                );

            if (pinchStartDistance <= 0) {
                return;
            }

            const newScale =
                pinchStartScale *
                (
                    currentDistance /
                    pinchStartDistance
                );

            zoomAt(
                newScale,
                pinchCenterX,
                pinchCenterY
            );

            return;
        }

        /*
         * 1本指ドラッグ
         */

        if (
            pointers.size === 1 &&
            isDragging
        ) {
            const deltaX =
                event.clientX - dragStartX;

            const deltaY =
                event.clientY - dragStartY;

            /*
             * 画像が拡大されている場合はドラッグ可能
             */

            translateX =
                dragStartTranslateX + deltaX;

            translateY =
                dragStartTranslateY + deltaY;

            applyTransform();
        }
    }
);


/* =========================================================
   ポインター終了
   ========================================================= */

image.addEventListener(
    "pointerup",
    function (event) {
        handlePointerEnd(event);
    }
);

image.addEventListener(
    "pointercancel",
    function (event) {
        handlePointerEnd(event);
    }
);

image.addEventListener(
    "pointerleave",
    function (event) {
        /*
         * pointerleaveでは通常処理しない。
         * pointerup / pointercancelで終了させる。
         */
    }
);


/* =========================================================
   ポインター終了処理
   ========================================================= */

function handlePointerEnd(event) {
    pointers.delete(event.pointerId);

    /*
     * 2本指から1本指に戻った場合
     */

    if (pointers.size === 1) {
        const point =
            Array.from(
                pointers.values()
            )[0];

        dragStartX = point.x;
        dragStartY = point.y;

        dragStartTranslateX =
            translateX;

        dragStartTranslateY =
            translateY;

        isDragging = true;

        return;
    }

    /*
     * ポインターがなくなった
     */

    if (pointers.size === 0) {
        isDragging = false;
    }
}


/* =========================================================
   2点間の距離
   ========================================================= */

function distance(point1, point2) {
    const dx =
        point1.x - point2.x;

    const dy =
        point1.y - point2.y;

    return Math.sqrt(
        dx * dx + dy * dy
    );
}


/* =========================================================
   2点の中点
   ========================================================= */

function midpoint(point1, point2) {
    return {
        x:
            (point1.x + point2.x) / 2,

        y:
            (point1.y + point2.y) / 2,
    };
}


/* =========================================================
   ダブルクリック
   ========================================================= */

image.addEventListener(
    "dblclick",
    function (event) {
        event.preventDefault();

        const rect =
            viewer.getBoundingClientRect();

        const x =
            event.clientX - rect.left;

        const y =
            event.clientY - rect.top;

        if (
            Math.abs(
                scale -
                fitScale * DOUBLE_TAP_SCALE
            ) < 0.01
        ) {
            zoomAt(
                fitScale * INITIAL_SCALE,
                x,
                y
            );
        } else {
            zoomAt(
                fitScale * DOUBLE_TAP_SCALE,
                x,
                y
            );
        }
    }
);


/* =========================================================
   タップによるダブルタップ判定
   ========================================================= */

image.addEventListener(
    "pointerup",
    function (event) {
        /*
         * マウスによるpointerupは
         * dblclick側で処理する。
         */

        if (event.pointerType === "mouse") {
            return;
        }

        const now = Date.now();

        const x = event.clientX;
        const y = event.clientY;

        const timeDifference =
            now - lastTapTime;

        const distanceDifference =
            Math.sqrt(
                Math.pow(
                    x - lastTapX,
                    2
                ) +
                Math.pow(
                    y - lastTapY,
                    2
                )
            );

        if (
            timeDifference <=
                DOUBLE_TAP_TIME &&
            distanceDifference <=
                DOUBLE_TAP_DISTANCE
        ) {
            const rect =
                viewer.getBoundingClientRect();

            const centerX =
                x - rect.left;

            const centerY =
                y - rect.top;

            if (
                Math.abs(
                    scale -
                    fitScale *
                        DOUBLE_TAP_SCALE
                ) < 0.01
            ) {
                zoomAt(
                    fitScale *
                        INITIAL_SCALE,
                    centerX,
                    centerY
                );
            } else {
                zoomAt(
                    fitScale *
                        DOUBLE_TAP_SCALE,
                    centerX,
                    centerY
                );
            }

            lastTapTime = 0;

            return;
        }

        lastTapTime = now;
        lastTapX = x;
        lastTapY = y;
    }
);


/* =========================================================
   音声一覧の取得
   ========================================================= */

function loadVoices() {
    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    voices =
        window.speechSynthesis.getVoices();

    voiceSelect.innerHTML = "";

    /*
     * 日本語音声を優先して表示する。
     */

    const sortedVoices =
        [...voices].sort(
            function (a, b) {
                const aJapanese =
                    a.lang.toLowerCase()
                        .startsWith("ja");

                const bJapanese =
                    b.lang.toLowerCase()
                        .startsWith("ja");

                if (
                    aJapanese &&
                    !bJapanese
                ) {
                    return -1;
                }

                if (
                    !aJapanese &&
                    bJapanese
                ) {
                    return 1;
                }

                return a.name.localeCompare(
                    b.name
                );
            }
        );

    sortedVoices.forEach(
        function (voice, index) {
            const option =
                document.createElement(
                    "option"
                );

            option.value = String(index);

            option.textContent =
                voice.name +
                " (" +
                voice.lang +
                ")";

            option.dataset.voiceName =
                voice.name;

            option.dataset.voiceLang =
                voice.lang;

            voiceSelect.appendChild(
                option
            );
        }
    );

    /*
     * 日本語音声を初期選択
     */

    const japaneseIndex =
        sortedVoices.findIndex(
            function (voice) {
                return voice.lang
                    .toLowerCase()
                    .startsWith("ja");
            }
        );

    if (japaneseIndex >= 0) {
        voiceSelect.value =
            String(japaneseIndex);
    }
}


/* =========================================================
   音声一覧の初期化
   ========================================================= */

if (
    "speechSynthesis" in window
) {
    loadVoices();

    /*
     * Chromeなどでは、ページ読み込み直後には
     * 音声一覧がまだ取得できないことがある。
     */

    window.speechSynthesis.onvoiceschanged =
        loadVoices;
} else {
    voiceSelect.disabled = true;

    playButton.disabled = true;
    pauseButton.disabled = true;
    stopButton.disabled = true;
}


/* =========================================================
   読み上げ開始
   ========================================================= */

function startSpeech() {
    if (
        !("speechSynthesis" in window)
    ) {
        alert(
            "このブラウザでは音声読み上げを利用できません。"
        );

        return;
    }

    if (!explanationText) {
        return;
    }

    /*
     * 現在の読み上げを停止
     */

    window.speechSynthesis.cancel();

    speechUtterance =
        new SpeechSynthesisUtterance(
            explanationText
        );

    /*
     * 読み上げ速度
     */

    speechUtterance.rate =
        Number(rateSlider.value);

    /*
     * 日本語を基本設定
     */

    speechUtterance.lang =
        "ja-JP";

    /*
     * 選択された音声を使用
     */

    const selectedIndex =
        Number(voiceSelect.value);

    if (
        Number.isInteger(selectedIndex) &&
        voices[selectedIndex]
    ) {
        speechUtterance.voice =
            voices[selectedIndex];

        speechUtterance.lang =
            voices[selectedIndex].lang;
    }

    /*
     * 読み上げ終了
     */

    speechUtterance.onend =
        function () {
            speechUtterance = null;
        };

    /*
     * 読み上げエラー
     */

    speechUtterance.onerror =
        function (event) {
            console.warn(
                "音声読み上げエラー:",
                event
            );

            speechUtterance = null;
        };

    window.speechSynthesis.speak(
        speechUtterance
    );
}


/* =========================================================
   再生ボタン
   ========================================================= */

playButton.addEventListener(
    "click",
    function () {
        /*
         * 一時停止中なら再開
         */

        if (
            window.speechSynthesis &&
            window.speechSynthesis.paused
        ) {
            window.speechSynthesis.resume();

            return;
        }

        startSpeech();
    }
);


/* =========================================================
   一時停止ボタン
   ========================================================= */

pauseButton.addEventListener(
    "click",
    function () {
        if (
            "speechSynthesis" in window
        ) {
            window.speechSynthesis.pause();
        }
    }
);


/* =========================================================
   停止ボタン
   ========================================================= */

stopButton.addEventListener(
    "click",
    function () {
        if (
            "speechSynthesis" in window
        ) {
            window.speechSynthesis.cancel();

            speechUtterance = null;
        }
    }
);


/* =========================================================
   読み上げ速度
   ========================================================= */

rateSlider.addEventListener(
    "input",
    function () {
        rateValue.textContent =
            Number(
                rateSlider.value
            ).toFixed(1);
    }
);


/* =========================================================
   閉じるボタン
   ========================================================= */

closeButton.addEventListener(
    "click",
    function () {
        /*
         * 音声停止
         */

        if (
            "speechSynthesis" in window
        ) {
            window.speechSynthesis.cancel();
        }

        /*
         * 自分自身のウィンドウを閉じる。
         *
         * ブラウザのセキュリティ上、
         * スクリプトから閉じられない場合がある。
         */

        try {
            window.close();
        } catch (error) {
            console.warn(
                "window.close() failed:",
                error
            );
        }
    }
);


/* =========================================================
   画面サイズ変更
   ========================================================= */

let resizeTimer = null;

function handleViewportChange() {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(
        function () {
            /*
             * 回転などで画面サイズが変わった場合、
             * 現在の画像位置をできるだけ維持する。
             */

            applyTransform();
        },
        100
    );
}


window.addEventListener(
    "resize",
    handleViewportChange
);


if (window.visualViewport) {
    window.visualViewport.addEventListener(
        "resize",
        handleViewportChange
    );
}


/* =========================================================
   画像のドラッグによるブラウザ標準動作防止
   ========================================================= */

image.addEventListener(
    "dragstart",
    function (event) {
        event.preventDefault();
    }
);


/* =========================================================
   コンテキストメニュー
   ========================================================= */

viewer.addEventListener(
    "contextmenu",
    function (event) {
        event.preventDefault();
    }
);


/* =========================================================
   ページ非表示時の音声停止
   ========================================================= */

document.addEventListener(
    "visibilitychange",
    function () {
        /*
         * 現段階では、ページを非表示にしても
         * 読み上げは継続させる。
         *
         * 必要であれば将来、
         * 「ページを離れたら停止」に変更可能。
         */
    }
);


/* =========================================================
   初期化
   ========================================================= */

loadImage();
