chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type == 'insta') {
        const nextArrowExistYn = document.getElementsByClassName(" _9zm2").length != 0
        const prevArrowExistYn = document.getElementsByClassName(" _9zm0").length != 0

        const mutipleImagePanelYn = (nextArrowExistYn || prevArrowExistYn)

        if (mutipleImagePanelYn) {
            if (!prevArrowExistYn) { // firstPage
                sendResponse(document.getElementsByClassName("_acay")[1].getElementsByClassName("_acaz")[0].getElementsByClassName("_aagt")[0].src)
            } else {
                sendResponse(document.getElementsByClassName("_acay")[1].getElementsByClassName("_acaz")[1].getElementsByClassName("_aagt")[0].src)
            }
        } else {
            sendResponse(document.getElementsByClassName("_aagu _aato")[0].getElementsByClassName("_aagt")[0].src)
        }
    } else if (request.type == 'tistory') {
        const script = document.getElementsByTagName("script");

        for (var i = 0; i < script.length; i++) {
            if (script[i].innerHTML.includes("T.config") || script[i].innerHTML.includes("tistory")) {
                sendResponse(true);
                return;
            }
        }

        sendResponse(false);
    } else if (request.type == 'tweetdeck') {
        const link = document.getElementsByClassName("js-media-image-link");
        var targetImageList = new Set();

        for (var i = 0; i < link.length; i++) {
            if (link[i].href == request.link) {
                const imageUrl = link[i].style.backgroundImage; // scheme: url("${imageUrl}")
                targetImageList.add(imageUrl.split("\"")[1]);
            }
        }
        sendResponse(Array.from(targetImageList));
    } else {
        sendResponse(null);
    }
});