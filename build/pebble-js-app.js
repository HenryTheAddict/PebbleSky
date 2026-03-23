/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	module.exports = __webpack_require__(2);


/***/ }),
/* 1 */
/***/ (function(module, exports) {

	/**
	 * Copyright 2024 Google LLC
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	
	(function(p) {
	  if (!p === undefined) {
	    console.error('Pebble object not found!?');
	    return;
	  }
	
	  // Aliases:
	  p.on = p.addEventListener;
	  p.off = p.removeEventListener;
	
	  // For Android (WebView-based) pkjs, print stacktrace for uncaught errors:
	  if (typeof window !== 'undefined' && window.addEventListener) {
	    window.addEventListener('error', function(event) {
	      if (event.error && event.error.stack) {
	        console.error('' + event.error + '\n' + event.error.stack);
	      }
	    });
	  }
	
	})(Pebble);


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	var keys = __webpack_require__(3);
	var BSKY_HOST = 'https://bsky.social';
	var ACCESS_TOKEN = '';
	var REFRESH_TOKEN = '';
	var DID = '';
	var CURRENT_URI = '';
	var CURRENT_CID = '';
	var CREDS_KEY = 'pebblesky_creds_v1';
	var CLOUDPEBBLE_USERNAME = '';
	var CLOUDPEBBLE_APP_PASSWORD = '';
	
	function readCredentials() {
	  var raw = localStorage.getItem(CREDS_KEY);
	  if (!raw) {
	    return null;
	  }
	  try {
	    var parsed = JSON.parse(raw);
	    if (!parsed.username || !parsed.appPassword) {
	      return null;
	    }
	    return parsed;
	  } catch (e) {
	    return null;
	  }
	}
	
	function writeCredentials(username, appPassword) {
	  localStorage.setItem(CREDS_KEY, JSON.stringify({
	    username: username,
	    appPassword: appPassword
	  }));
	}
	
	function sendMessage(text) {
	  var dict = {};
	  dict[keys.message] = text;
	  Pebble.sendAppMessage(dict);
	}
	
	function sendPost(author, content, likes, reposts, replies, uri, cid) {
	  var dict = {};
	  dict[keys.status] = 0;
	  dict[keys.message] = 'OK';
	  dict[keys.author_handle] = (author || '').substring(0, 48);
	  dict[keys.post_content] = (content || '').substring(0, 160);
	  dict[keys.likes_count] = likes || 0;
	  dict[keys.reposts_count] = reposts || 0;
	  dict[keys.reply_count] = replies || 0;
	  dict[keys.post_id] = (uri || '').substring(0, 120);
	  dict[keys.post_cid] = (cid || '').substring(0, 120);
	  Pebble.sendAppMessage(dict);
	}
	
	function req(path, method, headers, body, onSuccess, onError) {
	  var xhr = new XMLHttpRequest();
	  xhr.onload = function() {
	    if (xhr.status >= 200 && xhr.status < 300) {
	      onSuccess(xhr.responseText ? JSON.parse(xhr.responseText) : {});
	      return;
	    }
	    if (onError) {
	      onError(xhr.status, xhr.responseText);
	    }
	  };
	  xhr.onerror = function() {
	    if (onError) {
	      onError(0, 'Network error');
	    }
	  };
	  xhr.open(method, BSKY_HOST + path);
	  if (headers) {
	    Object.keys(headers).forEach(function(k) {
	      xhr.setRequestHeader(k, headers[k]);
	    });
	  }
	  if (body) {
	    xhr.send(JSON.stringify(body));
	  } else {
	    xhr.send();
	  }
	}
	
	function createSession(done) {
	  var creds = readCredentials();
	  if (!creds && CLOUDPEBBLE_USERNAME && CLOUDPEBBLE_APP_PASSWORD) {
	    creds = {
	      username: CLOUDPEBBLE_USERNAME,
	      appPassword: CLOUDPEBBLE_APP_PASSWORD
	    };
	  }
	  if (!creds) {
	    sendMessage('Open settings');
	    return;
	  }
	  req('/xrpc/com.atproto.server.createSession', 'POST', {
	    'Content-Type': 'application/json'
	  }, {
	    identifier: creds.username,
	    password: creds.appPassword
	  }, function(json) {
	    ACCESS_TOKEN = json.accessJwt || '';
	    REFRESH_TOKEN = json.refreshJwt || '';
	    DID = json.did || '';
	    if (!ACCESS_TOKEN || !DID) {
	      sendMessage('Auth failed');
	      return;
	    }
	    done();
	  }, function() {
	    sendMessage('Login failed');
	  });
	}
	
	function refreshSession(done) {
	  if (!REFRESH_TOKEN) {
	    createSession(done);
	    return;
	  }
	  req('/xrpc/com.atproto.server.refreshSession', 'POST', {
	    'Authorization': 'Bearer ' + REFRESH_TOKEN
	  }, null, function(json) {
	    ACCESS_TOKEN = json.accessJwt || ACCESS_TOKEN;
	    REFRESH_TOKEN = json.refreshJwt || REFRESH_TOKEN;
	    DID = json.did || DID;
	    done();
	  }, function() {
	    createSession(done);
	  });
	}
	
	function withSession(done) {
	  if (ACCESS_TOKEN && DID) {
	    done();
	    return;
	  }
	  createSession(done);
	}
	
	function postText(entry) {
	  if (!entry || !entry.record) {
	    return '';
	  }
	  if (entry.record.text) {
	    return entry.record.text;
	  }
	  return '[non-text post]';
	}
	
	function fetchTimeline() {
	  withSession(function() {
	    req('/xrpc/app.bsky.feed.getTimeline?limit=1', 'GET', {
	      'Authorization': 'Bearer ' + ACCESS_TOKEN
	    }, null, function(json) {
	      if (!json.feed || !json.feed.length || !json.feed[0].post) {
	        sendMessage('No timeline');
	        return;
	      }
	      var p = json.feed[0].post;
	      CURRENT_URI = p.uri || '';
	      CURRENT_CID = p.cid || '';
	      sendPost(
	        p.author && p.author.handle ? p.author.handle : '@unknown',
	        postText(p),
	        p.likeCount || 0,
	        p.repostCount || 0,
	        p.replyCount || 0,
	        CURRENT_URI,
	        CURRENT_CID
	      );
	    }, function(code) {
	      if (code === 401) {
	        refreshSession(fetchTimeline);
	        return;
	      }
	      sendMessage('Timeline failed');
	    });
	  });
	}
	
	function createRecord(collection, record, okMessage) {
	  withSession(function() {
	    req('/xrpc/com.atproto.repo.createRecord', 'POST', {
	      'Authorization': 'Bearer ' + ACCESS_TOKEN,
	      'Content-Type': 'application/json'
	    }, {
	      repo: DID,
	      collection: collection,
	      record: record
	    }, function() {
	      sendMessage(okMessage);
	      fetchTimeline();
	    }, function(code) {
	      if (code === 401) {
	        refreshSession(function() {
	          createRecord(collection, record, okMessage);
	        });
	        return;
	      }
	      sendMessage('Action failed');
	    });
	  });
	}
	
	function likePost(uri, cid) {
	  createRecord('app.bsky.feed.like', {
	    '$type': 'app.bsky.feed.like',
	    subject: { uri: uri, cid: cid },
	    createdAt: new Date().toISOString()
	  }, 'Liked');
	}
	
	function repostPost(uri, cid) {
	  createRecord('app.bsky.feed.repost', {
	    '$type': 'app.bsky.feed.repost',
	    subject: { uri: uri, cid: cid },
	    createdAt: new Date().toISOString()
	  }, 'Reposted');
	}
	
	function fetchReplies(uri) {
	  withSession(function() {
	    req('/xrpc/app.bsky.feed.getPostThread?depth=2&uri=' + encodeURIComponent(uri), 'GET', {
	      'Authorization': 'Bearer ' + ACCESS_TOKEN
	    }, null, function(json) {
	      var root = json.thread;
	      if (!root || !root.replies || !root.replies.length) {
	        sendMessage('No replies');
	        return;
	      }
	      var replyNode = root.replies[0];
	      var rp = replyNode.post;
	      if (!rp) {
	        sendMessage('No replies');
	        return;
	      }
	      sendPost(
	        rp.author && rp.author.handle ? rp.author.handle : '@unknown',
	        postText(rp),
	        rp.likeCount || 0,
	        rp.repostCount || 0,
	        rp.replyCount || 0,
	        rp.uri || '',
	        rp.cid || ''
	      );
	    }, function(code) {
	      if (code === 401) {
	        refreshSession(function() {
	          fetchReplies(uri);
	        });
	        return;
	      }
	      sendMessage('Replies failed');
	    });
	  });
	}
	
	function savePost(uri) {
	  var raw = localStorage.getItem('pebblesky_saved_v1');
	  var arr = [];
	  if (raw) {
	    try { arr = JSON.parse(raw); } catch (e) { arr = []; }
	  }
	  if (arr.indexOf(uri) === -1) {
	    arr.push(uri);
	  }
	  localStorage.setItem('pebblesky_saved_v1', JSON.stringify(arr));
	  sendMessage('Saved');
	}
	
	function handleAction(actionType, uri, cid) {
	  if (!uri || !cid) {
	    sendMessage('No post loaded');
	    return;
	  }
	  if (actionType === 'like') {
	    likePost(uri, cid);
	    return;
	  }
	  if (actionType === 'repost') {
	    repostPost(uri, cid);
	    return;
	  }
	  if (actionType === 'replies') {
	    fetchReplies(uri);
	    return;
	  }
	  if (actionType === 'save') {
	    savePost(uri);
	    return;
	  }
	  sendMessage('Unsupported');
	}
	
	function configPageUrl() {
	  var creds = readCredentials() || {};
	  var u = creds.username || '';
	  var p = creds.appPassword || '';
	  var html = '<html><body style=\"font-family:sans-serif;padding:16px\">' +
	    '<h3>PebbleSky Settings</h3>' +
	    '<p>Use BlueSky app password.</p>' +
	    '<label>Handle</label><br/><input id=\"u\" style=\"width:100%\" value=\"' + u.replace(/\"/g, '&quot;') + '\"/><br/><br/>' +
	    '<label>App Password</label><br/><input id=\"p\" style=\"width:100%\" value=\"' + p.replace(/\"/g, '&quot;') + '\"/><br/><br/>' +
	    '<button onclick=\"save()\" style=\"width:100%;height:40px\">Save</button>' +
	    '<script>function save(){var d={username:document.getElementById(\"u\").value,appPassword:document.getElementById(\"p\").value};document.location=\"pebblejs://close#\"+encodeURIComponent(JSON.stringify(d));}</script>' +
	    '</body></html>';
	  return 'data:text/html,' + encodeURIComponent(html);
	}
	
	Pebble.addEventListener('ready', function() {
	  fetchTimeline();
	});
	
	Pebble.addEventListener('showConfiguration', function() {
	  Pebble.openURL(configPageUrl());
	});
	
	Pebble.addEventListener('webviewclosed', function(e) {
	  if (!e.response) {
	    return;
	  }
	  try {
	    var conf = JSON.parse(decodeURIComponent(e.response));
	    if (conf.username && conf.appPassword) {
	      writeCredentials(conf.username, conf.appPassword);
	      ACCESS_TOKEN = '';
	      REFRESH_TOKEN = '';
	      DID = '';
	      sendMessage('Settings saved');
	      fetchTimeline();
	    }
	  } catch (err) {
	    sendMessage('Settings invalid');
	  }
	});
	
	Pebble.addEventListener('appmessage', function(e) {
	  var actionType = e.payload[keys.action_type];
	  var uri = e.payload[keys.post_id] || CURRENT_URI;
	  var cid = e.payload[keys.post_cid] || CURRENT_CID;
	  if (actionType) {
	    handleAction(actionType, uri, cid);
	  } else {
	    fetchTimeline();
	  }
	});


/***/ }),
/* 3 */
/***/ (function(module, exports) {

	module.exports = {"action_type":7,"author_handle":3,"error":9,"likes_count":5,"message":1,"post_cid":10,"post_content":4,"post_id":2,"reply_count":8,"reposts_count":6,"status":0}

/***/ })
/******/ ]);
//# sourceMappingURL=pebble-js-app.js.map