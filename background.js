
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // ToDo: Make this save html/images/css

  if (request.action == "saveHTML") {

    shared.send_message("current_tab", { action: 'get_uid' }, function(response) {
      if (response["success"]) {
        var uid = response["uid"];
        var page = response["page"];

        chrome.tabs.query({active: true}, function(tabs) {
          chrome.pageCapture.saveAsMHTML({ "tabId": tabs[0].id }, function(mhtmlData) {
              filename = 'fwee.mhtml';
              saveAs(mhtmlData, filename);
              sendResponse( { success: true } );
          });
        });
      }
    })
  }
});
