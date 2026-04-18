'use strict';

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[arr.length - 1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

try {
  var utype = navigator.userAgent.toLowerCase();
  var url = "https://www.gwdang.com/app/extension/?browser=chrome2";
  var uninstallUrl = 'https://www.gwdang.com/brwext/uninstall?browser=chrome';
  if (utype.indexOf('qqbrowser') > -1) {
    url = "https://www.gwdang.com/app/extension/?browser=qq";
    uninstallUrl = 'https://www.gwdang.com/brwext/uninstall?browser=qq';
  }
  if (utype.indexOf('opr') > -1) {
    url = "https://www.gwdang.com/app/extension/?browser=opera";
    uninstallUrl = 'https://www.gwdang.com/brwext/uninstall?browser=opera';
  }
  if (utype.indexOf('edg') > -1) {
    url = "https://www.gwdang.com/app/extension/?browser=edge";
    uninstallUrl = 'https://www.gwdang.com/brwext/uninstall?browser=edge';
  }
  chrome.storage.local.get('run_before', function(data) {
    if (data && data.run_before == "1") {
      return;
    } else {
      chrome.storage.local.set({
        'run_before': '1'
      });
      const localStorage = data
      if (!localStorage['ran_before']) {
        localStorage['ran_before'] = '1';
        chrome.tabs.create({
          url: url
        });
      }
    }
  })

} catch (e) {};

function createUserId() {
  var time = (new Date()).getTime();
  var beforestr = '';
  var type = 'chrome';
  var str = "abcdefghij";
  if (navigator.userAgent.toLowerCase().indexOf('qqbrowser') > -1)
    type = 'qq';
  if (navigator.userAgent.toLowerCase().indexOf('opr') > -1)
    type = 'opera';
  if (navigator.userAgent.toLowerCase().indexOf('edg') > -1)
    type = 'edge';
  for (var i = 0; i < 3; i++) {
    beforestr = beforestr + str[parseInt(Math.random() * 10)]
  }
  var userid = type + beforestr + time;
  return userid;
};
(function() {
  var manifestData = chrome.runtime.getManifest();
  var version = manifestData && manifestData.version;
  var browserSetInfo = {
    setStyle: 'top',
    setTip: '1',
    top_fold: '0',
    bottom_fold: '0',
    setWishlist: '1',
    setShowPromo: '1',
    setInfoNum: '1',
    sethaitao: '1',
    setPage: '1',
    setsteam: '1',
    fold: '0',
    promotion: '1',
    version: version,
    user_extension_id: createUserId(),
    localHost: chrome.runtime.getURL('./')
  }
  chrome.storage.local.get('browser_setinfo', function(data) {
    if (data && data.browser_setinfo) {
      for (var pattern in browserSetInfo) {
        browserSetInfo[pattern] = data.browser_setinfo[pattern] || browserSetInfo[pattern];
      }
    }
    chrome.cookies.get({
      url: "https://browser.gwdang.com/brwext/permanent_id",
      name: "plt_user_email"
    }, function(e) {
      if (e && e.value) {
        if (e.value.indexOf('%') > -1) {
          e.value = decodeURIComponent(e.value);
        }
        browserSetInfo.email = e.value;
      }
      chrome.storage.local.set({
        browser_setinfo: browserSetInfo
      })
    })

  })
})();

var BASE64_MARKER = ';base64,';

function convertDataURIToBinary(dataURI) {
  var base64 = dataURI
  var raw = atob(base64).split(',');
  var rawLength = raw.length;
  var array = new Uint8Array(new ArrayBuffer(rawLength));

  for(var i = 0; i < rawLength; i++) {
    array[i] = parseInt(raw[i]);
  }
  return array;
}

chrome.runtime.onMessage.addListener(
  function(obj, sender, sendResponse) {
    let xml = null
    const whiteListL1 = [
      '.gwdang.com',
      '.bijiago.com',
    ]
    const whiteListL2 = [
      ...whiteListL1,
      '.jd.hk',
      '.yiyaojd.com',
      '.jd.com',
      '.taobao.com',
      '.tmall.com',
      '.tmall.hk',
      '.1688.com',
      '.amazon.com',
      '.vip.com',
      '.vipglobal.hk',
      '.jingdonghealth.cn'
    ]
    if ((obj.url || obj.info) && (obj.type.includes('proxyRequest') || obj.type === 'getTaobaoTrend')) {
      const referer = obj.referer
      if (!referer) {
        return
      }
      let url = new URL(obj.url || obj.info), refererUrl = new URL(referer)
      let host = url.host, refererHost = refererUrl.host

      // if refererHost in whiteListL2, use whiteListL2 otherwise use whiteListL1
      const whiteList = whiteListL2.some(item => refererHost.endsWith(item)) ? whiteListL2 : whiteListL1

      const allow = whiteList.some(item => {
        return host.endsWith(item)
      })
      if (!allow) {
        // console.warn('not allowed to request', obj.url, 'from', referer)
        return
      }
    }
    switch (obj.type) {
      case 'cookie':
        // console.log('setting cookie', obj.data)
        chrome.cookies.set({
          url: 'https://browser.gwdang.com',
          name: 'dfp',
          value: obj.data,
          domain: 'gwdang.com',
          sameSite: 'no_restriction',
          secure: true
        })
        break;
      case 'cookie-fp':
        // console.log('setting cookie', obj.data)
        chrome.cookies.set({
          url: 'https://browser.gwdang.com',
          name: 'fp',
          value: obj.data,
          domain: 'gwdang.com',
          sameSite: 'no_restriction',
          secure: true
        })
        break;
      case 'checkUserToken':
        chrome.cookies.get({
          url: 'https://i.gwdang.com',
          name: 'GWD_USER_TOKEN'
        }, function(e) {
          let val = e ? e.value: ''
          sendResponse(`${val}`)
        })
        break;
      case 'sendListInfo':
        fetch(obj.url, {
          method: 'post',
          body: convertDataURIToBinary(obj.data),
          headers: {
            'Content-Type': 'application/octet-stream'
          }
        });
        break;
      case 'proxyRequestPost':
        fetch(obj.url, {
          method: 'post',
          body: obj.data,
          headers: {
            'x-referer': obj.referer
          }
        }).then(r => r.text()).then(r => {
          try {
            sendResponse(JSON.parse(r))
          } catch (e) {
            sendResponse(r)
          }
        });
        break
      case 'proxyRequestPostForm':
        let formData = new FormData()
        console.log(obj.data)
        if (obj.data.GWD_FORCE_FILE) {
          let forceFileList = obj.data.GWD_FORCE_FILE
          delete obj.data.GWD_FORCE_FILE
          forceFileList.forEach(item => {
            const imgBase64 = obj.data[item]
            const fileType = imgBase64.split(';')[0].split('/')[1]

            const file = dataURLtoFile(imgBase64, `blob`)
            obj.data[item] = file
          })
        }
        Object.keys(obj.data).forEach(item => {
          formData.append(item, obj.data[item])
        })

        // const data = new URLSearchParams()
        // for (const pair of formData) {
        //   data.append(pair[0], pair[1]);
        // }
        fetch(obj.url, {
          method: 'post',
          body: formData,
          headers: {
            'x-referer': obj.referer
          }
        }).then(r => r.text()).then(r => {
          try {
            sendResponse(JSON.parse(r))
          } catch (e) {
            sendResponse(r)
          }
        });
        break
      case 'proxyRequestPostWWWForm':
        console.log(obj.data)
        const params = Object.keys(obj.data).map(item => {
          return `${encodeURIComponent(item)}=${encodeURIComponent(obj.data[item])}`
        }).join('&')
        console.log(params)

        fetch(obj.url, {
          method: 'post',
          body: params,
          headers: {
            // 'x-referer': obj.referer,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }).then(r => r.text()).then(r => {
          try {
            sendResponse(JSON.parse(r))
          } catch (e) {
            sendResponse(r)
          }
        });
        break
      case "proxyRequest":
        request(obj.url.replace('callback=?', ''), function(data) {
          try {
            data = JSON.parse(data)
          } catch (err) {

          }
          sendResponse(data)
        }, obj.referer)
        break;
      case "getTaobaoTrend":
        request(obj.info, function(content) {
          sendResponse(content)
        })
        break;
      case "opentab":
        opentab()
        break;
      case "loginRender":
        loginRender()
        break;
      case "addFavorCheck":
        addFavorCheck();
        break;
      case "clearReduce":
        console.log('onMessage clearReduce')
        clearReduce()
        break;
      case "loginout":
        loginout()
        break;
      default:
        // request(obj.url, function(content) {
        //   sendResponse(content)
        // })
        console.log('empty type', obj.type)
    }
    return true
  });


function buildUrl(name, callback) {
  if (!name || name == '') return;
  var year = (new Date()).getFullYear();
  var month = (new Date()).getMonth() + 1;
  var date = (new Date()).getDate();
  if (month < 10) month = '0' + month.toString()
  else month = month.toString();
  if (date < 10) date = '0' + date.toString()
  else date = date.toString();
  var datastr = 'staobaoz_' + year.toString() + month + date;
  var url = "https://s.taobao.com/search?q=&imgfile=&js=1&stats_click=search_radio_all%253A1&initiative_id=" + datastr + "&ie=utf8&tfsid=" + name + "&app=imgsearch";
  request(url, function(data) {
    var newdata = data.match(/\<script\>\s+g_page_config\s=\s(.*)/);
    if (newdata) newdata = newdata[1].match(/(\{.*\});/)
    if (newdata) newdata = newdata[1];
    callback(newdata)
  })
}

function opentab() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("html/setting.html")
  });
}

function request(url, callback, referer) {
  fetch(url, {
    headers: {
      'x-referer': referer
    }
  }).then(r => r.text()).then(r => callback(r))
};


function getFavor(email, pg, callback) {
  if (!email) return;
  // console.log(`getFavor(${email}, ${pg})`)
  var url = "https://www.gwdang.com/window/collect?email=" + email + "&pg=" + pg + "&ps=50";
  request(url, function(data) {
    callback(data)
  })
}
var getTimes, getPg, EmailCache, favorArr = []

function editFavor(data) {
  try {
    data = JSON.parse(data)
    if (!data || data.result_code !== 1) return;
    favorArr = favorArr.concat(data.list)
    if (data.count > 50) {
      getTimes = Math.ceil(data.count / 50);
      getTimes--;
      getPg++;
      getFavor(EmailCache, getPg, editFavor2)
      getTimes--;
      getPg++;
    } else {
      calFavorReduce()
    }

  } catch (e) {}
}

function editFavor2(data) {
  try {
    if (getTimes > 0) {
      getFavor(EmailCache, getPg, editFavor2)
      getTimes--;
      getPg++;
    }
    data = JSON.parse(data)
    favorArr = favorArr.concat(data.list)
    if (getTimes === 0) {
      calFavorReduce()
    }
  } catch (e) {}
}

function loginout() {
  chrome.storage.local.get("favorData", function(data) {
    if (data.favorData) {
      let obj = {}
      obj[EmailCache] = data.favorData
      chrome.storage.local.set(obj, function() {
        chrome.storage.local.remove('favorData')
        chrome.storage.local.remove('favorList')
        EmailCache = null;
      })
    }
  })
}

function loginRender() {
  firstCheckFavor()
  chrome.cookies.get({
    url: "https://www.gwdang.com/",
    name: "plt_user_email"
  }, function(e) {
    if (e && e.value) {
      EmailCache = e.value;
      chrome.storage.local.get(EmailCache, function(data) {
        if (data[EmailCache]) {
          chrome.storage.local.get("favorData", function(data2) {
            if (!data2.favorData) {
              chrome.storage.local.set(data)
            }
          })
        }
      })
    }
  })
}

function clearReduce() {
  let fdata = {}
  console.log('clearReduce called')
  chrome.browserAction.setBadgeText({
    text: ""
  })
  localStorage.setItem("reduceNum", "0");
  chrome.storage.local.get('favorData', function(data) {
    if (data && data.favorData) {
      fdata = data.favorData;
    }
    console.log('get favor data here', fdata)
    chrome.storage.local.get('favorList', function(data2) {
      if (data2.favorList) {
        for (let i = 0; i < data2.favorList.length; i++) {
          fdata[data2.favorList[i].dp_id] = data2.favorList[i].price;
          data2.favorList[i].newreduce = "";
        }
      }
      let dp_ids = data2.favorList.map(function(v) {
        return v.dp_id;
      })
      for (let pattern in fdata) {
        if (dp_ids.indexOf(pattern) === -1) {
          delete fdata[pattern];
        }
      }
      chrome.storage.local.set({
        "favorData": fdata
      })
      console.log('setting data a', data2)
      chrome.storage.local.set(data2)
    })
    chrome.storage.local.get('remindDpIds', function(data2) {
      if (data2.remindDpIds) {
        let rsize = data2.remindDpIds.length;
        for (let i = rsize - 1; i >= 0; i--) {
          if (!fdata[data2.remindDpIds[i]]) {
            data2.remindDpIds.splice(i, 1);
          }
        }
      }
      console.log('setting data b', data2)
      chrome.storage.local.set(data2)
    })
  })
}

function calFavorReduce() {
  let reduceNum = 0;
  let remindIds = []
  if (favorArr.length === 0) return;
  let fdata = {}
  chrome.storage.local.get('favorData', function(data) {
    if (data && data.favorData) {
      fdata = data.favorData;
    }
    console.log('====================')
    console.log(fdata)
    console.log(favorArr)
    for (let i = 0; i < favorArr.length; i++) {
      if (favorArr[i].collection_price > favorArr[i].price) {
        if (!fdata[favorArr[i].dp_id] || favorArr[i].price < fdata[favorArr[i].dp_id]) {
          favorArr[i].newreduce = "newreduce";
          favorArr[i].priceDownTime = (new Date()).getTime();
          remindIds.push(favorArr[i].dp_id)
          reduceNum++
        }
        favorArr[i].reduce = (favorArr[i].collection_price - favorArr[i].price) / 100;
      }
    }
    chrome.storage.local.set({
      "favorList": favorArr
    })
    chrome.storage.local.set({
      "favorData": fdata
    })
    console.log('favorList:', favorArr)
    console.log('favorData:', fdata)
    sendNotifacation(reduceNum, remindIds)

  })
}

function checkFavor() {
  console.log('checkFavor called')
  favorArr = []
  var forbidF = localStorage.getItem("forbidFavor");
  if (forbidF) return;
  localStorage.setItem("checkTime", new Date().getTime());
  chrome.cookies.get({
    url: "https://www.gwdang.com/",
    name: "plt_user_email"
  }, function(e) {
    if (e && e.value) {
      EmailCache = e.value;
      getFavor(e.value, 1, editFavor)
      getPg = 1;
    }
  })
}

function addFavorCheck() {
  let time = Number(localStorage.getItem("checkTime"))
  if (new Date().getTime() - time > 20000) {
    checkFavor()
  } else {
    setTimeout(function() {
      checkFavor()
    }, 20000)
  }
}

function firstCheckFavor() {
  chrome.storage.local.get('firstCheck', function(data) {
    if (!data.firstCheck) {
      chrome.storage.local.set({
        "firstCheck": new Date().getTime()
      })
      addFavorCheck()
    }
  })
}

function sendChromeNotification(id, content) {
  try {
    chrome.notifications.create(id, content)
  } catch (e) {}
}

function sendNotifacation(num, remindIds) {
  console.log(`send notification ${num}`)
  let size = remindIds.length;
  chrome.storage.local.get('remindDpIds', function(data) {
    if (data && data.remindDpIds) {
      for (let i = size - 1; i >= 0; i--) {
        if (data.remindDpIds.indexOf(remindIds[i]) > -1) {
          remindIds.splice(i, 1);
          num--
        }
      }
    } else {
      data.remindDpIds = []
    }
    if (num > 0) {
      let reducenum = localStorage.getItem("reduceNum") || "0";
      reducenum = Number(reducenum);
      console.log('reduce num: ', reducenum)
      let num2 = num + reducenum;
      chrome.browserAction.setBadgeText({
        text: num2.toString()
      })
      localStorage.setItem("reduceNum", num2.toString());
      sendChromeNotification(new Date().getTime().toString(), {
        type: "basic",
        title: "降价提醒",
        message: "您收藏的商品有" + num + "件降价哦",
        iconUrl: '../images/icon128.png'
      })
      let newArr = data.remindDpIds.concat(remindIds)
      chrome.storage.local.set({
        remindDpIds: newArr
      })
    }
  })
}

function getOnOffInfo() {
  var url = "https://cdn.gwdang.com/js/winFavorOnOff.json"
  request(url, function(data) {
    if (data && typeof data === "string") {
      try {
        data = JSON.parse(data)
        if (data && data.turnOff) {
          localStorage.setItem("forbidFavor", "1");
          window.forbidFavor = 1
        } else {
          localStorage.removeItem("forbidFavor");
          window.forbidFavor = 0
        }
      } catch (e) {}
    }
  })
}


chrome.alarms.onAlarm.addListener(function(alarm) {
  switch (alarm.name) {
    case "checkFavor":
      checkFavor()
      break;
    case "onOff":
      getOnOffInfo()
      break;
  }
})
chrome.alarms.create('checkFavor', {
  periodInMinutes: 8 // 本来是8
})
// chrome.alarms.create('onOff', {
//   periodInMinutes: 4
// })

/*添加卸载时候的请求*/
chrome.runtime.setUninstallURL(uninstallUrl);

// Add declarativeNetRequest rule for Taobao API requests
// chrome.declarativeNetRequest.updateDynamicRules({
//   removeRuleIds: [1], // Remove existing rule if any
//   addRules: [{
//     id: 1,
//     condition: {
//       regexFilter: "h5api.m.taobao.com/.*/mtop.relationrecommend.wirelessrecommend.recommend/.*",
//       resourceTypes: ["xmlhttprequest"],
//       initiatorDomains: [chrome.runtime.id]
//     },
//     action: {
//       type: "modifyHeaders",
//       requestHeaders: [{
//         header: "Referer",
//         operation: "set",
//         value: "https://s.taobao.com/search/"
//       }, {
//         header: "Origin",
//         operation: "set",
//         value: "https://s.taobao.com"
//       }]
//     }
//   }]
// });

import "./backgroundTask.js"
