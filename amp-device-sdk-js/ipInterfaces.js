var os = require("os");
var iwlist = require('wireless-tools/iwlist');
var ifconfig = require('wireless-tools/ifconfig');
var child_process = require('child_process');


var IPINTERFACES = {
  readWWAN0: function(callback) {
    ifconfig.status(function(err, status) {
      for (var i = 0; i < status.length; i++) {
        if (status[i].interface === 'wwan0') {
          if (callback) {
            callback(status[i]);
          }
        }
      }
    });
  },
  readWifiNetworks: function(callback) {
    iwlist.scan({ iface : 'wlan0', show_hidden : true }, function(err, networks) {
      if (callback) {
        callback(networks);
      }
    });
  },
  disconnectWifi: function(callback) {
    return ifconfig.down('wlan0', callback);
  },
  connectWifi: function(callback) {
    return child_process.exec('ifconfig wlan0', callback);
  },
  readAllInterfaces: function(callback) {
    ifconfig.status(function(err, status) {
      if (callback) {
        callback(status);
      }
    });
  },
  connectWWAN0: function(callback) {
    return child_process.exec('sudo ifup wwan0', callback);
  },
  disconnectWWAN0: function(callback) {
    return child_process.exec('sudo ifdown wwan0', callback);
  }
}

module.exports = IPINTERFACES;
