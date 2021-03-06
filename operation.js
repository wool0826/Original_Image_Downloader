/* Variables */
var hotkey = "None";
var sortOption = "None";
var tistoryMenuCreatedYn = false;
var useExtensionYn = false;

/* Constant Values */
const menuText = "Download Original Image";
const imagePatterns =  [
    "https://twitter.com/*", 
    "https://*.daum.net/*", 
    "http://*.daum.net/*",
    "https://*.tistory.com/*"
];
const pagePatterns = ["https://www.instagram.com/p/*"];

const urlRegexp = {
    'twitter': new RegExp(/https:\/\/twitter\.com\/[\S]*/, 'g'),
    'daum': new RegExp(/[\S]*\.daum\.net\/[\S]*/, 'g'),
    'instagram': new RegExp(/https:\/\/www.instagram\.com\/[\S]*/, 'g'),
    'tistory': new RegExp(/https:\/\/[\S]*\.tistory\.com\/[\S]*/, 'g')
};

const settingPageRegexp = {
    'chrome': new RegExp(/chrome:\/\/[\S]*/),
    'whale': new RegExp(/whale:\/\/[\S]*/),
}

/* Chrome Settings */
chrome.storage.local.get({
    hotkeyOption: "None",
    sortOption: "None"
}, function(items) {    
    hotkey = items.hotkeyOption;
    sortOption = items.sortOption;

    chrome.contextMenus.create({
        title: getMenuText(),
        contexts: ["image"],
        documentUrlPatterns: imagePatterns,
        id: "image"
    });

    chrome.contextMenus.create({
        title: getMenuText(),
        contexts: ["page"],
        documentUrlPatterns: pagePatterns,
        id: "page"
    });
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    chrome.storage.local.get({
        hotkeyOption: "None",
        sortOption: "None"
    }, function(items) {
        hotkey = items.hotkeyOption;
        sortOption = items.sortOption;

        chrome.contextMenus.update("image", {
            title: getMenuText()
        });

        chrome.contextMenus.update("page", {
            title: getMenuText()
        });

        if (tistoryMenuCreatedYn) {
            chrome.contextMenus.update("tistory", {
                title: getMenuText()
            });
        }
    }); 
});

function getMenuText() {
    return (hotkey == "None" ? "" : hotkey + " - ") + menuText;
}

/* Download */
chrome.contextMenus.onClicked.addListener(function onClick(info, tab) { 
    if (tab.url.match(urlRegexp['twitter']) != null) {
        const urlMap = parsingTwitterUrl(info.srcUrl);

        downloadImage(urlMap["baseUrl"] + "?format=" + urlMap["format"] + "&name=4096x4096");
    } else if (tab.url.match(urlRegexp['daum']) != null || tab.url.match(urlRegexp['tistory']) != null) {
        downloadImage(info.srcUrl + "?original");
    } else if (tab.url.match(urlRegexp['instagram']) != null) {
        downloadImageForInstagram();
    } else if (info.menuItemId == 'tistory') {
        downloadImage(info.srcUrl + "?original");
    } else {
        alert("인식할 수 없는 URL입니다!. " + tab.url);
    }
});

function downloadImage(imageUrl) {
    useExtensionYn = true;

    chrome.downloads.download({
        url: imageUrl
    });
}


chrome.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
    if (useExtensionYn) {
        useExtensionYn = false;
        suggest({ filename: getFileNamePrefix() + downloadItem.filename });
    } else {
        suggest({ filename: downloadItem.filename }); 
    }
});

function getFileNamePrefix() {
    var now = new Date();
    const formattedDate = now.toISOString().slice(2,10).replace(/-/g,"");

    if (sortOption == "folderSort") {
        return formattedDate + "/";
    } else if (sortOption == "dateAppend") {
        return formattedDate + "_";
    } else {
        return "";
    }
}

function parsingTwitterUrl(url) {
    var map = {};

    const urlSplit = url.split('?');
    map["baseUrl"] = urlSplit[0];

    /* 파일 확장자가 URL에 명시되어 있는 경우 활용. */
    const optionSplit = urlSplit[1].split('&');
    map["format"] = "jpg";

    for (var i=0; i<optionSplit.length; i++) {
        const parameter = optionSplit[i].split('=');
        map[parameter[0]] = parameter[1];
    }

    return map;
}

function downloadImageForInstagram() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (isBrowserSettingPage(tabs[0].url)) {
            return;
        }

        const tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { type: 'insta' }, function (response) {
            if (response != null) {
                downloadImage(response);
            } else if (chrome.runtime.lastError) {
                chrome.tabs.executeScript(tabId, { file: "injection.js" }, function () {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                        throw Error("Unable to inject script into tab" + tabId);
                    }

                    chrome.tabs.sendMessage(tabId, { type: 'insta' }, function (response) {
                        downloadImage(response);              
                    });
                });
            }
        });		
    });
}

/* For Unspecific Tistory Page */
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == "complete") {
        removeTistoryMenu();

        for (var regexp in urlRegexp) {
            if (tab.url.match(regexp) != null) {
                return;
            }
        }

        checkTistoryPage();
    }
});

function checkTistoryPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (isBrowserSettingPage(tabs[0].url)) {
            return;
        }

        const tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { type: 'tistory' }, function (response) {
            if (response != null) {
                if (response == true) {
                    createTistoryMenu();
                }  
            } else if (chrome.runtime.lastError) {
                chrome.tabs.executeScript(tabId, { file: "injection.js" }, function () {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                        throw Error("Unable to inject script into tab" + tabId);
                    }
                    
                    chrome.tabs.sendMessage(tabId, { type: 'tistory' }, function (response) {
                        if (response == true) {
                            createTistoryMenu();
                        }     
                    });                
                });
            }
        });
    });    
}


function isBrowserSettingPage(url) {
    return url.match(settingPageRegexp['chrome']) != null || url.match(settingPageRegexp['whale']) != null;
}

/* Tistory Context Menus */
function createTistoryMenu() {
    if (!tistoryMenuCreatedYn) {
        chrome.contextMenus.create({
            title: getMenuText(),
            contexts: ["image"],
            id: "tistory"
        });

        tistoryMenuCreatedYn = true;
    }
}

function removeTistoryMenu() {
    if (tistoryMenuCreatedYn) {
        chrome.contextMenus.remove("tistory");

        tistoryMenuCreatedYn = false;
    }
}