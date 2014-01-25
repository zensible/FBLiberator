var port = chrome.runtime.connect();


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
    fbExtendMsg.send({"action": "show_message", "str": "Scrolling back to the beginning of your timeline (step 1 of 4)"})
    fbExtendMsg.send({"action": "show_status", "num": "1"})

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
   * 2. Click all 'More posts from Date to Date' links, e.g. show 'non-highlight' posts
   * 
   * These links (in the format of 'More posts from August 18 to September 11') disappear when clicked. Thus we can keep checking the total number to get a reliable indicator of whether one is still being loaded.
   */
  more_posts_num: 0,

  clickMorePosts: function(num) {
    fbExtendMsg.send({"action": "show_message", "str": "Clicking all of your posts (step 2 of 4)"})
    fbExtendMsg.send({"action": "show_status", "num": "2"})

    more_posts_links = jQuery('.uiMorePager a.pam.uiBoxWhite.noborder.uiMorePagerPrimary');
    if (num == -1) {
      num = more_posts_links.length
    }

    this.debugOut("== Click more posts: " + num + "," + more_posts_links.length);

    if (jQuery('.uiMorePager a.pam.uiBoxWhite.noborder.uiMorePagerPrimary').length == 0) {
      this.debugOut("== no more posts to click");
      this.clickShowComments(-1);
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
   * 3. Click all 'show comment' links and all 'View X more comment' links
   */
  clickShowComments: function(num) {
    fbExtendMsg.send({"action": "show_message", "str": "Clicking all 'show comment' links (step 3 of 4)"})
    fbExtendMsg.send({"action": "show_status", "num": "3"})

    this.debugOut("== Click show comments");
    this.saveHtml();
  },

  saveHtml: function() {
    fbExtendMsg.send({"action": "show_message", "str": "Saving html!"})
    fbExtendMsg.send({"action": "show_status", "num": "4"})

    this.debugOut("== Save HTML");
    fbExtendMsg.send({"action": "saveHTML"})
  },

  consoleLog: function(str) {
    fbExtendMsg.send({"action": "consoleLog", "str": str})
  }
}

var fbExtendMsg = {
  send: function(obj) {
    chrome.runtime.sendMessage(obj, function(response) {
      console.log(response);
    });
  }
}

jQuery.noConflict();

jQuery( document ).ready(function() {
  fbExtend.debugOut("== Loaded!");
});


/*
 * Cross-script request listeners: Content
 */
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {

  // "Expand timeline" clicked. Load all posts and comments
  if (request.action == "expand_timeline") {
    fbExtendMsg.send({"action": "show_message", "str": "Expanding the timeline!"})
    if (fbExtend.getPage() == 'timeline') {
      fbExtend.scrollDown();
      sendResponse( { success: true } );
    } else {
      sendResponse( { success: false, error: "Err!" } );
    }

  }

});