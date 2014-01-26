
/*
 * Development process:
 * 
 * Make changes in text editor
 * Go to chrome://extensions/
 * Hit apple + R
 * Hit https://www.facebook.com/jarvis.salanakis (or wherever)
 * Hit apple + R
 * Click the liberator icon in the address bar
 */

/*
 * Popup has loaded. Retrieve or set state.
 */

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (status == "complete") {
    fb_liberator.init_popup();
  }
});

$( document ).ready(function() {

  fb_liberator.init_popup();

  $('#save_timeline').click(function() {
    fb_liberator.save_timeline();
  });

  $('.btn-url').click(function() {
    var url = $(this).data('url');
    var new_tab = $(this).data('newtab');
    fb_liberator.go_url(url, new_tab);
  });

});

/* 
 * Popover's state
 */
fb_liberator = {};
fb_liberator.cur_tab = null;
fb_liberator.uid = null;
fb_liberator.url = null;
fb_liberator.page = null;

fb_liberator.init_popup = function() {

  // Step 1: set cur_tab and url
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var tab = tabs[0];
    fb_liberator.cur_tab = tab;
    fb_liberator.url = tab.url;
  });

  // Step 2: populate page, uid
  fb_liberator.get_uid_page();
}

/*
 * get_uid_page: gets the user's uid, either fbid: 1000001394801 or username: bill.murray
 */
fb_liberator.get_uid_page = function() {
  shared.send_message("current_tab", { action: 'get_uid' }, function(response) {
    //console.log("get_uid response");
    //console.log(response);
    if (response["success"]) {
      var uid = response["uid"];
      fb_liberator.uid = uid;
      fb_liberator.select_page(response["page"]);
    } else {
      fb_liberator.select_page(response["page"]);
    }
  });
}

fb_liberator.select_page = function(page) {
  // Sets page's body's class to either 'home' or 'timeline'
  $('body').attr("class", page);

  var pageUC = page.replace(/^(.)|\s(.)/g, function($1){ return $1.toUpperCase( ); });
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    $('#page').text(pageUC + ": " + tabs[0].title);
  });
};

/*
 * Go to the URL specified in the data-url of the button that was clicked
 */
fb_liberator.go_url = function(url, new_tab) {
  url = url.replace(/\[id\]/, fb_liberator.uid || "");

  //fb_liberator.show_message({ code: "window.location = '" + url + "';" });
  if (new_tab) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.create({ url: url });
    });
  } else {
    shared.send_message("current_tab", { action: 'go_url', url: url }, function(response) {
      fb_liberator.get_uid_page();
      if (response["success"]) {
        //fb_liberator.show_message("go url success");
      } else {
        //fb_liberator.show_message("go url fail");
      }
    });
  }
}

fb_liberator.save_timeline = function() {
  $('#spinner').show();

  // Send 'get timeline' event to active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendRequest(tabs[0].id, { action: 'expand_timeline' }, function(response) {
      if (response == undefined) {
        console.log("== Error: restart chrome");
        // If this happens, somehow the events system broke down. Restart chrome and it will be fine
      }
      console.log(response);
      if (response.success) {
        fb_liberator.show_message("Worked!");
      } else {
        fb_liberator.show_message(response.error);
      }
    });

  });
}



fb_liberator.page_mode = function() {

};

fb_liberator.show_message = function(str) {
  $('#message').show();
  $('#message').html(str)
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  /*
  console.log(sender.tab ?
              "From a content script:" + sender.tab.url :
              "From the extension");
  console.log("Popup received action: " + request.action);
  */

  // show_status: shows which step the timeline download is at
  if (request.action == "show_status") {
    $('#load_timeline_status').show();
    var num = request.num.toString();
    $('#status' + num).show();

    if (num == "4") {
      $('#spinner').hide();
      chrome.browserAction.setBadgeText({ "text": "" })
    } else {
      chrome.browserAction.setBadgeText({ "text": num + "of4" })
    }

    sendResponse( { success: true } );
  }

  /*
  if (request.action == "consoleLog") {
    console.log("==" + request.str);
    sendResponse( { success: true } );
  }

  if (request.action == "setBadge") {
    chrome.browserAction.setBadgeText({ "text": request.str })

    sendResponse( { success: true } );
  }
  */

  if (request.action == "show_message") {
    fb_liberator.show_message(request.str);
    sendResponse( { success: true } );
  }


});

