
shared = {};

shared.send_message = function(type, obj, callback) {
  console.log("++++ send message: " + type);
  console.log("+++ obj: ");
  console.log(obj);
  console.log("+++ callback: ");
  console.log(callback);

  if (type == "runtime") {
    chrome.runtime.sendMessage(obj, function(response) {
      console.log("+++ response: ");
      console.log(response);
      if (callback) {
        callback(response);
      }
    });
  }

  if (type == "current_tab") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log("current_tab:");
      console.log(tabs[0]);
      chrome.tabs.sendRequest(tabs[0].id, obj, function(response) {
        console.log("+++ response: ");
        console.log(response);
        callback(response);
        if (callback) {
          callback(response);
        }
      });
    });
  }
};

