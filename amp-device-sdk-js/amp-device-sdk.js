const mqtt = require('mqtt');
var ip = require('./ipInterfaces');
var EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
var emitter = new EventEmitter();

const sdkConfig = require('/etc/amp-sdk-js/config/ampSdkJsConfig.json');
var mqttHost = sdkConfig.mqttHost;
var MQTT_URL = 'mqtts://' + mqttHost + ':8883';
var device = sdkConfig.device;
var topics = sdkConfig.topics;
var tokenPolicy = sdkConfig.tokenPolicy;

// Function to generate Token
var generateSasToken = function(resourceUri, signingKey, policyName, expiresInMins) {
    resourceUri = encodeURIComponent(resourceUri);

    // Set expiration in seconds
    var expires = (Date.now() / 1000) + expiresInMins * 60;
    expires = Math.ceil(expires);
    var toSign = resourceUri + '\n' + expires;

    // Use crypto
    var hmac = crypto.createHmac('sha256', new Buffer(signingKey, 'base64'));
    hmac.update(toSign);
    var base64UriEncoded = encodeURIComponent(hmac.digest('base64'));

    // Construct autorization string
    var token = "SharedAccessSignature sr=" + resourceUri + "&sig="
    + base64UriEncoded + "&se=" + expires;
    if (policyName) token += "&skn="+policyName;
    console.log("Token = " + token);
    return token;
};

var mqttOptions = {
  'clientId': device.deviceId,
  'username': mqttHost + '/' + device.deviceId + '/DeviceClientType=azure-iot-device%2F1.1.0-dtpreview&api-version=2016-09-30-preview',
  'password': generateSasToken(tokenPolicy.resourceUri, tokenPolicy.signingKey, tokenPolicy.policyName, 60)
}

//Publish IpInterfaces
function publishIpInterfaces(mqttClient, topic, callback) {
  ip.readAllInterfaces(function(interfaces) {
    var payload = JSON.stringify({
      'op': 'ipInterfaces',
      'ts': Date.now(),
      'data': interfaces
    });
    console.log('MQTT: send on topic %s, message %s', topic, payload);
    mqttClient.publish(topic, payload, callback);
  });
}




var aersdk = (function() {
  //Connect to MQTT
  var _mqttClient = mqtt.connect(MQTT_URL, {
    username: mqttOptions.username,
    password: mqttOptions.password,
    clientId: mqttOptions.clientId
  });
  //Publish IP interfaces on connect
  _mqttClient.on('connect', function(connack) {
    console.log("Connected to MQTT", connack);
    if (connack) {
      publishIpInterfaces(_mqttClient, topics.telemetry, function(error){
        if (error) {
          console.log("Error in publish ", error);
        }
      });
    }
  });
  _mqttClient.on('error', function(error) {
    //console.log("Error from mqtt client", error);
  });
  _mqttClient.on('close', function(error) {
    //console.log("CLosed mqtt client", error);
  });
  //Load SMS Listener
  var smsListener = require('./smsListener')(emitter);
  emitter.on('disconnecting_wwan0', function() {
    console.log("Received disconnecting_wwan0 event");
    publishIpInterfaces(_mqttClient, topics.telemetry, function(error){
      if (error) {
        console.log("Error in publish ", error);
      }
    });
    emitter.emit('disconnect_wwan0');
  });

  //Return public interfaces
  return {
    publish: function(message, callback) {
      var payload = JSON.stringify(message);
      console.log('MQTT: send on topic %s, message %s', topics.d2c, payload);
      _mqttClient.publish(topics.d2c, payload, callback);
    },
    subscribe: function(callback) {
      _mqttClient.subscribe(topics.c2d, function(error, granted) {
        if (error) {
          throw Error(error);
        }
        if (!granted) {
          throw new Error("Unauthorized to receive");
        }
        _mqttClient.on('message', function(topic, message) {
          console.log('MQTT: received on topic %s, message %s', topic, message);
          if (callback) {
            callback(message.toString());
          }
          var payload = {
            "op": "ack",
            "ts": Date.now()
          };
          _mqttClient.publish(topics.ack, JSON.stringify(payload), function(){
            console.log("Published ack");
          });
        });
      });

    }
  };
})();

module.exports = aersdk;
