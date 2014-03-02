
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // ToDo: Make this save html/images/css

  if (request.action == "saveHTML") {
    console.log("save");
    shared.send_message("current_tab", { action: 'process_page_to_html' }, function(response) {
      filename = "test.html";
      console.log(response.html);

      var blob = new Blob([response.html], {type: "text/plain;charset=utf-8"});
      saveAs(blob, filename);
    });

  }
});
