
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // ToDo: Make this save html/images/css

  if (request.action == "saveHTML") {
    console.log("save");

    shared.send_message("current_tab", { action: 'get_uid' }, function(response) {
      var uid = response["uid"];
      var page = response["page"];

      shared.send_message("current_tab", { action: 'process_page_to_html' }, function(response) {
        console.log("response from process_page_to_html COMPLETE")
        sendResponse( { success: true } );
      });
    });
  }

  if (request.action == "saveHTML2") {
    console.log("SAVE HTML 2");
    console.log(request);
    var blob = new Blob([request.html], {type: "text/plain;charset=utf-8"});

    var uid = request.uid;
    uid = uid.uid;
    var page = uid.page;

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();
    var filename = "FB-Backup";
    filename += "-" + uid.replace(/\W/, '.').replace(/\.+/, "-");
    filename += "-timeline";
    filename += "-" + yyyy + "." + mm + "." + dd;
    filename += ".html"

    saveAs(blob, filename);

    sendResponse( { success: true } );
  }

});
