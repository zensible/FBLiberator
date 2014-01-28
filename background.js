
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // ToDo: Make this save html/images/css

  if (request.action == "saveHTML") {

    shared.send_message("current_tab", { action: 'get_uid' }, function(response) {
      if (response["success"]) {
        var uid = response["uid"];
        var page = response["page"];

        chrome.tabs.query({active: true}, function(tabs) {
          chrome.pageCapture.saveAsMHTML({ "tabId": tabs[0].id }, function(mhtmlData) {
            var today = new Date();
            var dd = today.getDate();
            var mm = today.getMonth()+1; //January is 0!
            var yyyy = today.getFullYear();
            var filename = "FB-Backup";
            filename += "-" + uid.replace(/\W/, '.').replace(/\.+/, "-");
            filename += "-" + page;
            filename += "-" + yyyy + "." + mm + "." + dd;
            filename += ".mht";

            console.log("== before:");
            //console.log(mhtmlData.toString());

            var reader = new FileReader();
            reader.addEventListener("loadend", function() {
              var boundary = "";
              var arr_mhtml = reader.result.split(/\r?\n/);
              var sections = [];
              var section = null;
              var content_type = "";
              var content_transfer_encoding = "";
              var content_location = "";

              for (var x = 0; x < arr_mhtml.length; x++) {
                var line = arr_mhtml[x];

                // Search until we figure out the MHTML boundary
                if (boundary == "") {
                  var myRegexp = /^\s+boundary="(.+)"/;
                  var match = myRegexp.exec(line);
                  if (match && match.length > 0) {
                    boundary = match[1];
                    console.log("boundary: " + boundary);
                  } else {
                    continue;
                  }
                }

                if (x > 30000) {
                  break;
                }

                /*
                 * A new section has begun. Save the old one if it exists and start a new one
                 */
                //console.log(line + "," + "--" + boundary + "," + (line == "--" + boundary));
                if (line.indexOf("--" + boundary) == 0) {
                  console.log("=== new section");
                  if (section) {
                    sections.push(section);
                    console.log(section);
                    break;
                  }

                  x += 1;
                  var arr = arr_mhtml[x].split(": ");
                  content_type = arr[1];

                  x += 1;
                  arr = arr_mhtml[x].split(": ");
                  content_transfer_encoding = arr[1];

                  x += 1;
                  arr = arr_mhtml[x].split(": ");
                  content_location = arr[1];

                  x += 1
                  section = {
                    "content_type": content_type,
                    "content_transfer_encoding": content_transfer_encoding,
                    "content_location": content_location,
                    "text": "",
                    "base64": ""
                  }
                } else if (section) {
                  var str = line;
                  console.log(line.length);
                  console.log(line.charAt(75));

                  if (content_transfer_encoding == "quoted-printable") {
                    if (line.length == 76 && line.charAt(75) == "=") {
                      str = line.slice(0, 75);
                    } else {
                      str = line + "\n";
                    }
                    section["text"] += str;
                  } else {
                    section["base64"] += str;
                  }
                }
              }

              var mimelib = require("mimelib");
              var text = mimelib.decodeQuotedPrintable(sections[0]["text"])

              console.log(text);
              saveAs(sections[0]["text"], filename);
              sendResponse( { success: true } );
            });

            reader.readAsText(mhtmlData);
          });
        });

      }
    });
  }

});
