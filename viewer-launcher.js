// viewer-launcher.js

function openViewer(imageURL, imageTitle) {
    const viewerURL =
        "https://funadamari.github.io/viewer/?image=" +
        encodeURIComponent(imageURL) +
        "&title=" +
        encodeURIComponent(imageTitle);

    window.open(viewerURL, "funadamariViewer");
}
