
$( document ).ready(function() {

  fb_liberator.display_popup();

  $('#save_timeline').click(function() {
    fb_liberator.save_timeline();
  });

  $('.btn-url').click(function() {
    var url = $(this).data('url');
    fb_liberator.go_url(url);
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

fb_liberator.display_popup = function() {

  // Step 1: set cur_tab and url
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var tab = tabs[0];
    fb_liberator.cur_tab = tab;
    fb_liberator.url = tab.url;
  });

  // Step 2: populate page, uid
  fb_liberator.set_page(function(page) {
    if (page == 'timeline') {
      fb_liberator.set_uid();
    }
    if (page == 'home') {

    }
  });
}

fb_liberator.set_page = function(callback) {
  shared.send_message("current_tab", { action: 'get_page' }, function(response) {
    fb_liberator.page = response["page"];

    // Sets page's body's class to either 'home' or 'timeline'
    $('body').attr("class", fb_liberator.page);

    var pageUC = fb_liberator.page.replace(/^(.)|\s(.)/g, function($1){ return $1.toUpperCase( ); });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      $('#page').text(pageUC + ": " + tabs[0].title);
    });

    callback(fb_liberator.page);
  });
}

fb_liberator.set_uid = function() {
  shared.send_message("current_tab", { action: 'get_uid' }, function(response) {
    if (response["success"]) {
      var uid = response["uid"];
      fb_liberator.uid = uid;
    } else {
      //fb_liberator.show_message("uid unavil");
    }
  });
}

fb_liberator.go_url = function(url) {
  url = url.replace(/\[id\]/, fb_liberator.uid);

  shared.send_message("current_tab", { action: 'go_url', url: url }, function(response) {
    if (response["success"]) {
      //fb_liberator.show_message("go url success");
    } else {
      //fb_liberator.show_message("go url fail");
    }
  });
}

fb_liberator.save_timeline = function() {
  console.log("== clicked");

  $('#spinner').show();
  //sessionStorage.setItem("username", "John");
  console.log("== clicked2");

  // Send 'get timeline' event to active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log("== clicked3");
    chrome.tabs.sendRequest(tabs[0].id, { action: 'expand_timeline' }, function(response) {
      console.log("== clicked4");
      console.log(response);
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


fb_liberator.select_page = function(page) {

};

fb_liberator.page_mode = function() {

};

fb_liberator.show_message = function(str) {
  $('#message').show();
  $('#message').html(str)
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(sender.tab ?
              "From a content script:" + sender.tab.url :
              "From the extension");
  console.log("Popup received action: " + request.action);

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

  if (request.action == "consoleLog") {
    console.log("==" + request.str);
    sendResponse( { success: true } );
  }

  if (request.action == "setBadge") {
    chrome.browserAction.setBadgeText({ "text": request.str })

    sendResponse( { success: true } );
  }

  if (request.action == "show_message") {
    fb_liberator.show_message(request.str);
    sendResponse( { success: true } );
  }


});

