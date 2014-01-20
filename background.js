chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // ToDo: Make this save html/images/css
  if (request.action == "saveHTML") {
    chrome.tabs.query({active: true}, function(tabs) {
      chrome.pageCapture.saveAsMHTML({ "tabId": tabs[0].id }, function(mhtmlData) {
        sendResponse( { success: true } );
      });
    });
  }

});
