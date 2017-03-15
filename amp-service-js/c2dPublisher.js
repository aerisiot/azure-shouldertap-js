'use strict';
var serviceConfig = require("./serviceConfig.json");
var caasClient = require("./aerCaaSClient");
var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
const uuidV4 = require('uuid/v4');
var azure = require("azure-sb");
var serviceBusService = azure.createServiceBusService(serviceConfig.serviceBusEndpoint);


var connectionString = serviceConfig.c2dConnectionString;

var pendingFeedback = [];


var serviceClient = Client.fromConnectionString(connectionString);

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

function receiveFeedback(err, receiver) {
  receiver.on('message', function(msg) {
    console.log('Feedback message:')
    console.log(msg.getData().toString('utf-8'));
    msg.getData().forEach(function(message) {
      if (message.description === 'Success') {
        delete pendingFeedback[message.deviceId];
      }
    });
  });
}

function checkForMessages(sbService, queueName, callback) {
  sbService.receiveQueueMessage(queueName, {
    isPeekLock: true
  }, function(err, lockedMessage) {
    if (err) {
      if (err == 'No messages to receive') {
        //console.log('No messages');
      } else {
        callback(err);
      }
    } else {
      callback(null, lockedMessage);
    }
  });
}

function processMessage(sbService, err, lockedMsg) {
  if (err) {
    console.log('Error on Rx: ', err);
  } else {
    console.log('Message from device ', lockedMsg.body);
    var deviceId = lockedMsg.customProperties["iothub-connection-device-id"];
    delete pendingFeedback[deviceId];
    sbService.deleteMessage(lockedMsg, function(err2) {
      if (err2) {
        //console.log('Failed to delete message: ', err2);
      } else {
        //console.log('Deleted message.');
      }
    });
  }
}




function sendShoulderTap(message, deviceId, serviceClient) {
  var messageId = message.messageId;
  var sentTime = pendingFeedback[deviceId];
  if (sentTime) {
    caasClient.getNetworkStatus(serviceConfig.accountId, serviceConfig.apiKey, serviceConfig.deviceProfileId, serviceConfig.userId, function(response) {
      var dataSession = response.dataSession;
      var isInValidIpSession = false;
      if (dataSession) {
        var ipAddress = dataSession.ipAddress;
        var sessionStartTime = new Date(dataSession.lastStartTime);
        var sessionStopTime = new Date(dataSession.lastStopTime);
        var currTime = new Date();
        if (ipAddress && (sessionStartTime.getTime() > sessionStopTime.getTime()) &&
          (sessionStartTime.getTime() < (currTime.getTime() - (5 * 60 * 1000)))) {
          isInValidIpSession = true;
        }
        console.log("IP Address = %s, isInValidIpSession = %s", ipAddress, isInValidIpSession);
      }
      if (!isInValidIpSession) {
        console.log("Sending shoulder tap message to device as SMS via AerFrame");
        var imsi = response.IMSI;
        caasClient.sendSms(serviceConfig.accountId, serviceConfig.apiKey, imsi, function(response) {
          //serviceClient.send(deviceId, message, printResultFor('SendAgain'));
        });
      }
    });
  } else {
    console.log("Not sending shouldertap as device is in session");
  }
}

var c2dPublisher = (function() {
  var serviceClient = Client.fromConnectionString(connectionString);
  setInterval(checkForMessages.bind(null, serviceBusService, "aerpi-5-servicebus-eventqueue", processMessage.bind(null, serviceBusService)), 5000);
  return {
    sendMessage: function(targetDevice, payload) {
      serviceClient.open(function(err) {
        if (err) {
          console.error('Could not connect: ' + err.message);
        } else {
          serviceClient.getFeedbackReceiver(receiveFeedback);
          var message = new Message(JSON.stringify(payload));
          message.ack = 'full';
          message.messageId = uuidV4();
          console.log('Sending message: ' + message.getData());
          serviceClient.send(targetDevice, message, printResultFor('send'));
          pendingFeedback[targetDevice] = Date.now();
          var timeout = setTimeout(sendShoulderTap, 10000, message, targetDevice, serviceClient);
        }
      });
    }
  }
})();

module.exports = c2dPublisher;
