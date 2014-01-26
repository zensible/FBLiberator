
shared = {};

shared.send_message = function(type, obj, callback) {
  console.log("++++ send message: " + type);
  console.log(obj);

  if (type == "runtime") {
    chrome.runtime.sendMessage(obj, function(response) {
      callback(response);
    });
  }

  if (type == "current_tab") {
    console.log("== 01");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log("== 02");
      console.log("tab:");
      console.log(tabs[0]);
      chrome.tabs.sendRequest(tabs[0].id, obj, function(response) {
        console.log("== 03");
        console.log(response);
        callback(response);
      });
    });
  }
};

