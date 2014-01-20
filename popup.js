
$( document ).ready(function() {
  console.log("== Popup Loaded!");

  $('#save_timeline').click(function() {
    console.log("== clicked");

    $('#spinner').show();

    // Send 'get timeline' event to active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      var tab = tabs[0];
      console.log(tab.id);
      chrome.tabs.sendRequest(tab.id, { action: 'expand_timeline' }, function(response) {
        console.log('Success?');
        console.log(response);
      });
    });
  });
});

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

});

