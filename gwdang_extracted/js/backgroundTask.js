/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 800:
/***/ ((module) => {

let e = {};
let s = {
  // server.get('/foo', (req, sendResponse) => { sendResponse('response from bg') })
  get(path, callback) {
    console.log('adding get handler');
    e[path] = callback;
  }
};
module.exports = s;
chrome.runtime.onMessage.addListener((obj, sender, sendResponse) => {
  if (obj.type === 'backgroundReq') {
    if (e[obj.path]) {
      const params = JSON.parse(obj.params);
      if (obj.path.includes('aistream')) {
        params.extSenderTab = sender.tab;
      }
      e[obj.path](params, function (result) {
        sendResponse(result);
      });
      return true;
    }
  }
});

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
// 背景页任务
console.log('background task run successful');
const s = __webpack_require__(800);
function copyCookie(name, url, fromPartition) {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({
      url: url,
      name: name,
      partitionKey: {
        topLevelSite: fromPartition
      }
    }, function (cookie) {
      if (cookie) {
        chrome.cookies.set({
          url: url,
          name: name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate,
          partitionKey: {
            topLevelSite: `chrome-extension://${chrome.runtime.id}`
          }
        }, function (cookie) {
          resolve(cookie);
        });
      } else {
        resolve(cookie);
      }
    });
  });
}
s.get('/setStorage', (req, res) => {
  chrome.storage.local.set(req);
  res();
});
s.get('/getStorage', (req, res) => {
  chrome.storage.local.get(req.key, data => {
    res(data[req.key]);
  });
});
s.get('/bgVer', (req, res) => {
  res('1.5');
});
s.get('/getCookie', (req, res) => {
  chrome.cookies.get({
    url: req.url,
    name: req.name
  }, cookie => {
    res(cookie);
  });
});
s.get('/copyCookie', (req, res) => {
  copyCookie(req.name, req.url, req.fromPartition).then(cookie => {
    res(cookie);
  });
});
s.get('/pddRequest', (req, res) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', req.url);
  xhr.withCredentials = true;
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accesstoken', req.token);
  xhr.onload = function () {
    if (this.status >= 200 && this.status < 300) {
      res(JSON.parse(xhr.response));
    } else {
      res({
        status: this.status,
        statusText: xhr.statusText
      });
    }
  };
  xhr.send(JSON.stringify(req.params));
});
s.get('/remoteAddress', (req, res) => {
  fetch(req.url).then(r => {
    res(r.url);
  });
});
s.get('/aistream', async (req, res) => {
  const dpId = req.dpId;
  const data = req.data;
  const referer = req.url;
  const activeTab = req.extSenderTab;
  const response = await fetch(`https://browser.gwdang.com/aistream?dp_id=${dpId}`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'x-referer': referer
    }
  });
  if (!response.ok) {
    console.error('HTTP error', response.status);
    res('REQ_FAILED');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let allText = '';
  const processChunk = async () => {
    allText = '';
    while (true) {
      const {
        done,
        value
      } = await reader.read();
      if (done) {
        console.log('Stream complete');
        break;
      }
      const text = decoder.decode(value, {
        stream: true
      });
      console.log('Received:', text);
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'stream',
        content: text,
        instanceId: req.instanceId
      });
      allText += text;
    }
  };
  await processChunk();
});
/******/ })()
;