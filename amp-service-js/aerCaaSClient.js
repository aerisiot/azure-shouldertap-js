const axios = require('axios');
const uuidV4 = require('uuid/v4');
var AERADMIN_GET_IP_URL = "https://aerport.aeris.com/ServicesProxy/remoteproxy?remoteurl=";
var WS_GET_IP_URL = "http://aeradminapi-2-fuse-prod.aeriscloud.com/AerAdmin_WS_5_0/rest/devices/network/details?accountID=ACCID&deviceProfileId=DEVICEID&email=USERID&apiKey=APIKEY&_=TIMESTAMP";

var AERFRAME_SEND_SMS_URL = "https://api.aerframe.aeris.com/smsmessaging/v2/ACCID/outbound/aftestapp/requests?apiKey=APIKEY";

var aerCaas = (function() {

  return {
    getNetworkStatus: function(accountId, apiKey, deviceId, userId, callback) {
      var url = WS_GET_IP_URL;
      url = url.replace("ACCID", accountId);
      url = url.replace("DEVICEID", deviceId);
      url = url.replace("USERID", userId);
      url = url.replace("APIKEY", apiKey);
      url = url.replace("TIMESTAMP", Date.now());
      axios.get(AERADMIN_GET_IP_URL+encodeURIComponent(url), {
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(function(response) {
        var payload = response.data;
        //Asume single mode device only
        var netresp = payload.networkResponse[0];
        if (callback) {
          callback(netresp);
        }
      }).catch(function(error) {
        console.log('Get IP Error = ', error);
      });
    },
    sendSms: function(accountId, apiKey, deviceId, callback) {
      var url = AERFRAME_SEND_SMS_URL;
      url = url.replace("ACCID", accountId);
      url = url.replace("APIKEY", apiKey);
      var payload = {
        "address": [
          deviceId
        ],
        "senderAddress": "af-app01",
        "outboundSMSTextMessage": {
          "message": "5,1"
        },
        "clientCorrelator": uuidV4(),
        "senderName": "AMP Service"
      };
      axios.post(url, payload).then(function(response) {
        if (callback) {
          callback(response.data);
        }
      }).catch(function(error) {
        console.log("Send SMS Error = ", error);
      });
    }
  };


})();

module.exports = aerCaas;
