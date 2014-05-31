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
    shared.send_message("runtime", {"action": "show_message", "str": "Scrolling back to the beginning of your timeline (step 1 of 5)"})
    shared.send_message("runtime", {"action": "show_status", "num": "1"})

    this.debugOut("== scroll down");

    jQuery("html, body").animate({ scrollTop: jQuery(document).height() }, "fast");
    this.scrollUnlessDone();
  },

  scrollUnlessDone: function() {
    if (this.bornVisible()) {
      this.debugOut("== born visible: done");

      this.clickMorePosts();
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
  more_posts_links: [],
  more_posts_timers: [],
  clickMorePosts: function() {

    shared.send_message("runtime", {"action": "show_message", "str": "Retrieving all posts (step 2 of 5). This may take several minutes."})
    shared.send_message("runtime", {"action": "show_status", "num": "2"})

    var selector_more_posts = '.uiMorePager a.pam.uiBoxWhite.noborder.uiMorePagerPrimary';

    this.more_posts_links = jQuery(selector_more_posts);
    this.more_posts_max = this.more_posts_links.length;
    obj = {
      "action": "setup_progressbar",
      "max": this.more_posts_max,
      "current": 0,
      "width": "0%"
    }
    shared.send_message("runtime", obj, function() { });

    multiplier = 750; // 750ms wait between calls to 'get more posts'
    wait_between_steps = 4000; // Gives the various 'get more posts' calls time to finish before we start copying comments
    if (this.more_posts_links.length == 0) {
      fbExtend.clickShowComments1();
    }
    for (var x = 0; x < this.more_posts_links.length; x++) {
      var more_posts_link = this.more_posts_links[x];
      this.more_posts_timers[x] = setTimeout(function(x, more_posts_max, more_posts_link) {
        more_posts_link.click();

        var wid = (Math.ceil(100 * (x / more_posts_max))).toString() + "%";
        var obj = {
          "action": "update_progressbar",
          "current": x,
          "width": wid
        }

        shared.send_message("runtime", obj, function() { });
        if (x == more_posts_max - 1) {
          setTimeout(function() {
            console.log("=== POSTS DONE!");
            fbExtend.clickShowComments1();
          }, wait_between_steps);
        }
      }, x * multiplier, x, this.more_posts_max, more_posts_link);
    }
  },

  /*
   * 3. Click all 'View X More Comments'
   */
  more_comments_max: 0,
  more_comments_links: [],
  more_comments_timers: [],
  clickShowComments1: function(num, time_so_far) {
    shared.send_message("runtime", {"action": "show_message", "str": "Retrieving all comment threads (step 3 of 5). This may take several minutes."})
    shared.send_message("runtime", {"action": "show_status", "num": "3"})

    var comment_selector = "a.UFIPagerLink";

    this.more_comments_links = jQuery(comment_selector);
    this.more_comments_max = this.more_comments_links.length

    obj = {
      "action": "setup_progressbar",
      "max": this.more_comments_max,
      "current": 0,
      "width": "0%"
    }
    shared.send_message("runtime", obj, function() { });

    multiplier = 750; // 750ms wait between calls to 'get more comments'
    wait_between_steps = 4000; // Gives the various 'get more comments' calls time to finish before we start copying comments
    if (this.more_comments_links.length == 0) {
      fbExtend.processDoc();
    }
    for (var x = 0; x < this.more_comments_links.length; x++) {
      var more_comments_link = this.more_comments_links[x];
      this.more_comments_timers[x] = setTimeout(function(x, more_comments_max, more_comments_link) {

        more_comments_link.click();

        var wid = (Math.ceil(100 * (x / more_comments_max))).toString() + "%";
        var obj = {
          "action": "update_progressbar",
          "current": x,
          "width": wid
        }
        shared.send_message("runtime", obj, function() { });

        if (x == more_comments_max - 1) {
          console.log("=== COMMENTS DONE 1!");
          setTimeout(function() {
            console.log("=== COMMENTS DONE 2!");
            shared.send_message("runtime", {"action": "show_message", "str": "Showing all comment threads (step 4 of 5). This should take less than a minute."})
            shared.send_message("runtime", {"action": "show_status", "num": "4"})

            var commentIcons = jQuery(".UFIBlingBoxTimelineCommentIcon");
            for (var y = 0; y < commentIcons.length; y++) {
              commentIcon = commentIcons[y];
              commentIcon.click();

              var wid = (Math.ceil(100 * (y / commentIcons.length))).toString() + "%";
              var obj = {
                "action": "update_progressbar",
                "current": y,
                "width": wid
              }
              shared.send_message("runtime", obj, function() { });
            }
            fbExtend.processDoc();
          }, wait_between_steps);
        }
      }, x * multiplier, x, this.more_comments_max, more_comments_link);
    }

  },

  cache: {},
  XHR_TIMEOUT: 45000,
  num_responses_required: 0,
  max_num_responses: 0,

  /*
   * Download all CSS, Images, Javascript and embed into document. Save document.
   */
  processDoc: function() {
    jQuery("html, body").animate({ scrollTop: 0 }, "fast");

    shared.send_message("runtime", {"action": "show_message", "str": "Saving timeline (step 5 of 5)."})
    shared.send_message("runtime", {"action": "show_status", "num": "5"})

    fbExtend.num_responses_required = 0;

    console.log("== ALL");
    var all = jQuery('*');
    for (var x = 0; x < all.length; x++) {
      var element = jQuery(all[x]);
      if (element.css("background-image")) {
        //console.log(element.css("background-image"));
        if (match = element.css("background-image").match(/^url\((http.+)\)/)) {
          fbExtend.num_responses_required += 1;
          var url = match[1];
          console.log("IMG URL", url);
          fbExtend.processDomItem(url, true, element, fbExtend.callbackBgImage)
        }
      }
    }
    console.log("== ALL LEN", fbExtend.num_responses_required);

    // 1. Handle all <script> tags, insert from remote
    var scripts = jQuery("script");
    fbExtend.num_responses_required += scripts.length;
    for (var x = 0; x < scripts.length; x++) {
      var script = jQuery(scripts[x]);
      var url = script.attr("src");
      if (!url) {
        url = script.attr("href");
      }
      console.log("url", url);
      fbExtend.processDomItem(url, false, script, fbExtend.callbackScript)
    }

    // 2. Handle all <link> tags, insert from remote
    var styles = jQuery("link");
    fbExtend.num_responses_required += styles.length;
    for (var x = 0; x < styles.length; x++) {
      var style = jQuery(styles[x]);
      var url = style.attr("src");
      if (!url) {
        url = style.attr("href");
      }
      console.log("url", url);
      fbExtend.processDomItem(url, false, style, fbExtend.callbackStyle)
    }

    // 2. Handle all <img> tags, insert from remote
    var images = jQuery("img");
    fbExtend.num_responses_required += images.length;
    for (var x = 0; x < images.length; x++) {
      var img = jQuery(images[x]);
      var url = img.attr("src");

      fbExtend.processDomItem(url, true, img, fbExtend.callbackImage)
    }

    fbExtend.max_num_responses = fbExtend.num_responses_required;
  },

  processDomItem: function(url, is_binary, orig_item, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    if (fbExtend.cache[url]) {
      fbExtend.xhr_complete();
      return fbExtend.cache[url];
    }

    if (is_binary) {
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(e) {
        fbExtend.xhr_complete();
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
          fbExtend.cache[url] = response;
          callback(url, orig_item, response)
        }
      };
    } else {
      xhr.onload = function(e) {
        fbExtend.xhr_complete();
        console.log("onload", e);
        if (this.status == 200) {
          var response = this.responseText;
          fbExtend.cache[url] = response;
          callback(url, orig_item, response);
        }
      }
    }
    xhr.onerror = function() {
      fbExtend.xhr_complete();
    };
    timeout = setTimeout(function() {
      // Has the XHR request has begun but not finished after 45s? Kill it and mark it complete
      if (xhr.readyState != 4) {
        fbExtend.xhr_complete();
      }

      xhr.abort();
    }, fbExtend.XHR_TIMEOUT);

    try {
      xhr.send(null);
    } catch (e) {
      fbExtend.xhr_complete();
    }
  },

  callbackStyle: function(url, style, response) {
    console.log("RESPONSE LINK", response.slice(0, 100));
    var obj = jQuery("<style/>", { text: response });
    jQuery(style).replaceWith(obj);

  },

  callbackScript: function(url, script, response) {
    console.log("RESPONSE SCRIPT", response.slice(0, 100));
    var obj = jQuery("<script/>", { text: response });
    jQuery(script).replaceWith(obj);
  },

  callbackImage: function(url, img, response) {
    img.attr("src", response);
  },

  callbackBgImage: function(url, img, response) {
    var val = "url('" + response + "')";
    console.log(val.slice(0, 200));
    img.css("background-image", val);
  },

  /*
   * Xhr finished, error'd out or timed out. Mark it complete. If all xhrs are complete, send a response to the caller
   */
  xhr_complete: function() {
    console.log("XHR COMPLETE", fbExtend.num_responses_required);
    fbExtend.num_responses_required -= 1;
    if (fbExtend.num_responses_required == 0) {  // All items to process have been completed, whether success or error

      jQuery('#pagelet_bluebar').hide();
      jQuery('.fbTimelineStickyHeader').hide();
      jQuery("#pagelet_timeline_profile_actions").hide();
      jQuery('#rightCol').hide();
      jQuery('#pagelet_dock').hide();

      html = jQuery('html').html();
      var uid = fbExtend.get_uid();

      console.log("=== SEND HTML");
      shared.send_message("runtime", {"action": "saveHTML2", "html": html, "uid": uid})

      //sendResponse( { success: true, html: html } );
    } else {
      var wid = (Math.ceil(100 * ((fbExtend.max_num_responses - fbExtend.num_responses_required) / fbExtend.max_num_responses))).toString() + "%";
      var obj = {
        "action": "update_progressbar",
        "current": (fbExtend.max_num_responses - fbExtend.num_responses_required),
        "width": wid
      }
      shared.send_message("runtime", obj, function() { });
    }

  },

  selector_timeline: '#fbProfileCover .cover h2 a',
  selector_home: '#pagelet_welcome_box a.fbxWelcomeBoxName',

  get_uid: function() {

    var cover_name = jQuery(fbExtend.selector_timeline);
    if (cover_name.length > 0) {
      // Find username linked to timeline within profile cover area of screen
      var uid = jQuery(cover_name[0]).attr('href');
      var arr = uid.split('facebook.com/');
      uid = arr[arr.length - 1];
      return { success: true, uid: uid, page: "timeline" };
    }

    cover_name = jQuery(fbExtend.selector_home);
    if (cover_name.length > 0) {
      var uid = jQuery(cover_name[0]).attr('href');
      var arr = uid.split('facebook.com/');
      uid = arr[arr.length - 1];
      return { success: true, uid: uid, page: "home" };
    }

  }
  // Cross-browser way to get a compatible XMLHttpRequest object, or raise an error trying
  /*
  createCORSRequest: function(method, url) {
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
  },

  if (request.action == "process_page_to_html") {
    var html = '';

    processDoc();

    sendResponse( { success: true } );
    return;
  }


  */
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
    sendResponse( fbExtend.get_uid() );
  }

  if (request.action == 'go_url') {
    var url = request.url;
    window.location = url;
    sendResponse( { success: true } );
    return;
  }

});

/*
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
*/