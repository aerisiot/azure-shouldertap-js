var sms = require("./sms");
var ip = require("./ipInterfaces");
var timeout = null;


module.exports = function(eventEmitter) {

  function processNewSMS(msgs) {
    console.log("New SMSes = " , msgs);
    if (timeout) {
      clearTimeout(timeout);
    }
    var msg = msgs[0];
    var parts = msg.content.split(",");
    ip.readWWAN0(function(wwan0){
      if (wwan0) {
        if (wwan0.up == true && (wwan0.ipv4_address) && wwan0.ipv4_address.startsWith('10.')){
          console.log("WWAN0 interface is already up and running. Details: ", wwan0);
        } else {
          ip.connectWWAN0(function(err){
            if (err) {
              console.log("Error in connecting to WWAN0 ", err);
            } else {
              console.log("Connected to WWAN0");
              eventEmitter.emit("connected_wwan0");
            }
          });
        }
      }
    });
    var delay = parts[0]*60*1000;
    timeout = setTimeout(disconnectWWAN0, delay);
    console.log("Started timer to disconnect after %s ms", delay);
  }

  function disconnectWWAN0() {
    eventEmitter.on('disconnect_wwan0', function(){
      ip.disconnectWWAN0(function(err){
        if (err) {
          console.log("Error in disconnecting WWAN0 ", err);
        } else {
          console.log("Disconnected WAN0");
        }
        sms.deletesms(function(resp) {
          console.log("Deleted all read sms", resp);
        });
      });
    });
    eventEmitter.emit("disconnecting_wwan0");
  }

  function readAndFilterSMSes() {
    sms.getsms(function(msgs){
      if (msgs && msgs.length > 0) {
        processNewSMS(msgs);
      }
    });
  }
  var interval = setInterval(readAndFilterSMSes, 7000);
  console.log("Started sms listener");

};
