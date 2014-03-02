var port = chrome.runtime.connect();

/*
 * Content.js: javascript which is injected into Facebook's DOM, extending its capabilities
 * 
 * Any interaction with facebook must happen here.
 */
var fbExtend = {
  debug_mode: true,
  timeout_scroll: null,

  debugOut: function(str) {
    if (this.debug_mode) {
      console.log(str);
    }
  },

  randInterval: function(start, end) {
    return Math.floor((Math.random() * (end - start)) + start);
  },

  getPage: function() {
    var body = jQuery('body');

    page = 'n/a';
    if (body.hasClass('home')) {
      page = 'home';
    }
    //
    // ToDo: photos, about, friends, messages
    //
    if (body.hasClass('timelineLayout')) {
      page = 'timeline';
    }
    this.debugOut("== page: " + page);
    return page;
  },

  /*
   * 1. Scroll until whole wall is shown
   */

  // Keeps scrolling down every 1-2s until we hit the 'Born' element
  scrollDown: function() {
    shared.send_message("runtime", {"action": "show_message", "str": "Scrolling back to the beginning of your timeline (step 1 of 4)"})
    shared.send_message("runtime", {"action": "show_status", "num": "1"})

    this.debugOut("== scroll down");

    jQuery("html, body").animate({ scrollTop: jQuery(document).height() }, "fast");
    this.scrollUnlessDone();
  },

  scrollUnlessDone: function() {
    if (this.bornVisible()) {
      this.debugOut("== born visible: done");

      this.clickMorePosts(-1);
    } else {
      this.debugOut("== pause then scroll");
      this.timeout_scroll = window.setTimeout(function() { fbExtend.scrollDown() }, this.randInterval(500, 1000));
    }
  },

  // If we see life event: Born then we have loaded the entire timeline
  bornVisible: function() {
    var found_it = false

    // No 'life events' visible
    if (jQuery("h3.lifeEventTitle.autofocus").length == 0) {
      return false;
    }

    // At least one 'life event' visible, see if it's 'Born'
    jQuery.each(jQuery("h3.lifeEventTitle.autofocus"), function(index, h3) {
      if (h3.innerText.match(/^Born/)) { // Can be either 'Born' or 'Born on {{date}}'
        found_it = true;
      }
    });
    return found_it;
  },

  /*
   * 2. Click all 'More posts from Date to Date' links, one at a time. E.g., show 'non-highlight' posts
   * 
   * These links (in the format of 'More posts from August 18 to September 11') disappear when clicked.
   * Thus we can keep checking the total number to get a reliable indicator of whether one is still being loaded.
   */
  more_posts_max: 0,
  clickMorePosts: function(num) {
    shared.send_message("runtime", {"action": "show_message", "str": "Retrieving all posts (step 2 of 4)"})
    shared.send_message("runtime", {"action": "show_status", "num": "2"})

    var selector_more_posts = '.uiMorePager a.pam.uiBoxWhite.noborder.uiMorePagerPrimary';

    more_posts_links = jQuery(selector_more_posts);
    if (num == -1) {
      num = more_posts_links.length

      obj = {
        "action": "setup_progressbar",
        "max": num,
        "current": 0,
        "width": "0%"
      }
      more_posts_max = num;
      shared.send_message("runtime", obj, function() { });
    } else {
      cur = more_posts_max - num;
      wid = (Math.ceil(100 * (cur / more_posts_max))).toString() + "%";

      obj = {
        "action": "update_progressbar",
        "current": cur,
        "width": wid
      }
      shared.send_message("runtime", obj, function() { });
    }

    this.debugOut("== Click more posts: " + num + "," + more_posts_links.length);

    if (jQuery(selector_more_posts).length == 0) {
      this.debugOut("== no more posts to click");
      this.clickShowComments1(-1);
    } else {
      if (parseInt(num) == parseInt(more_posts_links.length)) {
        more_posts_links[0].click();
        this.timeout_scroll = window.setTimeout(function() { fbExtend.clickMorePosts(num - 1) }, this.randInterval(500, 1500));
      } else {
        this.timeout_scroll = window.setTimeout(function() { fbExtend.clickMorePosts(num) }, this.randInterval(500, 1500));
      }
    }
  },

  /*
   * 3. Click all 'View X More Comments'
   */
  view_comments_max: 0,
  clickShowComments1: function(num) {
    shared.send_message("runtime", {"action": "show_message", "str": "Retrieving all comment threads (step 3 of 4)"})
    shared.send_message("runtime", {"action": "show_status", "num": "3"})

    this.debugOut("== Click show comments");
    // If page == 'home':
    comment_selector = "a.UFIPagerLink";

    view_more_comments_links = jQuery(comment_selector);
    if (num == -1) {
      num = view_more_comments_links.length

      obj = {
        "action": "setup_progressbar",
        "max": num,
        "current": 0,
        "width": "0%"
      }
      view_comments_max = num;
      shared.send_message("runtime", obj, function() { });
    } else {
      cur = view_comments_max - num;
      wid = (Math.ceil(100 * (cur / view_comments_max))).toString() + "%";

      obj = {
        "action": "update_progressbar",
        "current": cur,
        "width": wid
      }
      shared.send_message("runtime", obj, function() { });
    }

    if (jQuery(view_more_comments_links).length == 0) {
      this.debugOut("== no more posts to click");

      // This clicks all the 'show retrieved comments' links, actually displaying the downloaded contents
      show_comments_selector = 'i.UFIBlingBoxTimelineCommentIcon';
      show_comments_links = jQuery(show_comments_selector);
      for (var x = 0; x < show_comments_links.length; x++) {
        var link = show_comments_links[x];
        console.log("Showing comment: " + x);
        link.click();
      }
      this.saveHtml();
    } else {
      if (parseInt(num) == parseInt(view_more_comments_links.length)) {
        view_more_comments_links[0].click();
        this.timeout_scroll = window.setTimeout(function() { fbExtend.clickShowComments1(num - 1) }, this.randInterval(500, 1500));
      } else {
        this.timeout_scroll = window.setTimeout(function() { fbExtend.clickShowComments1(num) }, this.randInterval(500, 1500));
      }
    }
  },

  saveHtml: function() {
    shared.send_message("runtime", {"action": "show_message", "str": "Saving html!"})
    shared.send_message("runtime", {"action": "show_status", "num": "4"})

    this.debugOut("== Save HTML");
    shared.send_message("runtime", {"action": "saveHTML"})
  },

  /*
  consoleLog: function(str) {
    shared.send_message("runtime", {"action": "consoleLog", "str": str})
  }
  */
}

jQuery.noConflict();

jQuery( document ).ready(function() {
  fbExtend.debugOut("== Loaded!");
});


/*
 * Cross-script request listeners: Content
 */
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  console.log("== CONTENT request received: " + request.action);
  console.log(request);
  console.log(sender);

  // "Expand timeline" clicked. Load all posts and comments
  if (request.action == "expand_timeline") {
    shared.send_message("runtime", {"action": "show_message", "str": "Expanding the timeline!"})
    if (fbExtend.getPage() == 'timeline') {
      fbExtend.scrollDown();
      sendResponse( { success: true } );
    } else {
      sendResponse( { success: false, error: "Err!" } );
    }
  }

  //if (request.action == "get_page") {
  //  sendResponse( { success: true, page: fbExtend.getPage() } );
  //}

  /*
   * get_uid: by examining the current user's cover name, get his/her FB username
   */
  if (request.action == "get_uid") {

    var selector_timeline = '#fbProfileCover .cover h2 a';
    var selector_home = '#pagelet_welcome_box a.fbxWelcomeBoxName';

    var cover_name = jQuery(selector_timeline);
    if (cover_name.length > 0) {
      // Find username linked to timeline within profile cover area of screen
      var uid = jQuery(cover_name[0]).attr('href');
      var arr = uid.split('facebook.com/');
      uid = arr[arr.length - 1];
      sendResponse( { success: true, uid: uid, page: "timeline" } );
    }

    cover_name = jQuery(selector_home);
    if (cover_name.length > 0) {
      var uid = jQuery(cover_name[0]).attr('href');
      var arr = uid.split('facebook.com/');
      uid = arr[arr.length - 1];
      sendResponse( { success: true, uid: uid, page: "home" } );
    }
  }

  var cache = {};
  var XHR_TIMEOUT = 45000;
  var num_responses_required = 0;

  function processDoc() {

    // 1. Handle all <script> tags, insert from remote
    var scripts = jQuery("script");
    num_responses_required = scripts.length;
    for (var x = 0; x < scripts.length; x++) {
      var script = jQuery(scripts[x]);
      var url = script.attr("src");
      if (!url) {
        url = script.attr("href");
      }
      console.log("url", url);
      processDomItem(url, false, script, callbackScript)
    }

    // 2. Handle all <link> tags, insert from remote
    var styles = jQuery("link");
    num_responses_required += styles.length;
    for (var x = 0; x < styles.length; x++) {
      var style = jQuery(styles[x]);
      var url = style.attr("src");
      if (!url) {
        url = style.attr("href");
      }
      console.log("url", url);
      processDomItem(url, false, style, callbackStyle)
    }

    // 2. Handle all <img> tags, insert from remote
    var images = jQuery("img");
    num_responses_required += images.length;
    for (var x = 0; x < images.length; x++) {
      var img = jQuery(images[x]);
      var url = img.attr("src");

      processDomItem(url, true, img, callbackImage)
    }
  }

  function processDomItem(url, is_binary, orig_item, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    if (cache[url]) {
      xhr_complete();
      return cache[url];
    }

    if (is_binary) {
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
        xhr_complete();
        if (this.status == 200) {
          var uInt8Array = new Uint8Array(this.response);
          var i = uInt8Array.length;
          var binaryString = new Array(i);
          while (i--)
          {
            binaryString[i] = String.fromCharCode(uInt8Array[i]);
          }
          var data = binaryString.join('');

          var base64 = window.btoa(data);
          var response = "data:image/png;base64," + base64;
          cache[url] = response;
          orig_item.attr("src", response);
        }
      };
    } else {
      xhr.onload = function(e) {
        xhr_complete();
        console.log("onload", e);
        if (this.status == 200) {
          var response = this.responseText;
          cache[url] = response;
          callback(url, orig_item, response);
        }
      }
    }
    xhr.onerror = function() {
      xhr_complete();
    };
    timeout = setTimeout(function() {
      // Has the XHR request has begun but not finished after 45s? Kill it and mark it complete
      if (xhr.readyState != 4) {
        xhr_complete();
      }

      xhr.abort();
    }, XHR_TIMEOUT);

    try {
      xhr.send(null);
    } catch (e) {
      xhr_complete();
    }
  }

  function callbackStyle(url, style, response) {
    console.log("RESPONSE LINK", response.slice(0, 100));
    var obj = jQuery("<style/>", { text: response });
    jQuery(style).replaceWith(obj);

  }

  function callbackScript(url, script, response) {
    console.log("RESPONSE SCRIPT", response.slice(0, 100));
    var obj = jQuery("<script/>", { text: response });
    jQuery(script).replaceWith(obj);
  }

  function callbackImage(img) {

  }

  /*
   * Xhr finished, error'd out or timed out. Mark it complete. If all xhrs are complete, send a response to the caller
   */
  function xhr_complete() {
    console.log("XHR COMPLETE", num_responses_required);
    num_responses_required -= 1;
    if (num_responses_required == 0) {
      html = jQuery('html').html();
      //console.log("HTML", html);

      sendResponse( { success: true, html: html } );
    }
  }

  // Cross-browser way to get a compatible XMLHttpRequest object, or raise an error trying
  function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {

      // Check if the XMLHttpRequest object has a "withCredentials" property.
      // "withCredentials" only exists on XMLHTTPRequest2 objects.
      xhr.open(method, url, true);

    } else if (typeof XDomainRequest != "undefined") {

      // Otherwise, check if XDomainRequest.
      // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
      xhr = new XDomainRequest();
      xhr.open(method, url);

    } else {

      // Otherwise, CORS is not supported by the browser.
      xhr = null;

    }
    return xhr;
  }

  if (request.action == "process_page_to_html") {
    var html = '';

    processDoc();

    //html = jQuery('html').html();
    //console.log("HTML", html);

    //sendResponse( { success: true, html: html } );
  }

  if (request.action == 'go_url') {
    var url = request.url;
    window.location = url;
    sendResponse( { success: true } );
  }

});


function replaceURLs(content, host, requestManager, callback) {
  var i, url, result, values = removeComments(content).match(URL_EXP), requestMax = 0, requestIndex = 0;

  function sendRequest(origUrl) {
    requestMax++;
    requestManager.send(url, function(data) {
      requestIndex++;
      if (content.indexOf(origUrl) != -1) {
        data.mediaType = data.mediaType ? data.mediaType.split(";")[0] : null;
        content = content.replace(new RegExp(origUrl.replace(/([{}\(\)\^$&.\*\?\/\+\|\[\\\\]|\]|\-)/g, "\\$1"), "gi"), getDataURI(data,
            EMPTY_PIXEL_DATA, true));
      }
      if (requestIndex == requestMax)
        callback(content);
    }, null, "base64");
  }

  if (values)
    for (i = 0; i < values.length; i++) {
      result = values[i].match(URL_VALUE_EXP);
      if (result && result[1]) {
        url = formatURL(result[1], host);
        if (url.indexOf("data:") != 0)
          sendRequest(result[1]);
      }
    }
}