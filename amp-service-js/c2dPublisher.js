'use strict';
var util = require('util');
var serviceConfig = require("./serviceConfig.json");
var caasClient = require("./aerCaaSClient");
var Client = require('azure-iothub').Client;
var Message = require('azure-iot-common').Message;
const uuidV4 = require('uuid/v4');
var azure = require("azure-sb");
var serviceBusService = azure.createServiceBusService(serviceConfig.serviceBusEndpoint);
var EventEmitter = require('events').EventEmitter;

var connectionString = serviceConfig.c2dConnectionString;

var pendingFeedback = [];


var serviceClient = Client.fromConnectionString(connectionString);

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}

c2dPublisher.prototype._receiveFeedback = function(err, receiver) {
  receiver.on('message', function(msg) {
    //console.log('Feedback message:')
    //console.log(msg.getData().toString('utf-8'));
    msg.getData().forEach(function(message) {
      if (message.description === 'Success') {
        delete pendingFeedback[message.deviceId];
      }
    });
  });
}


function c2dPublisher() {
  var self = this;
  EventEmitter.call(this);

  this.serviceClient = Client.fromConnectionString(connectionString);
  //console.log("c2dPublisher ", this);
  setInterval(this._checkForMessages.bind(this, "aerpi-5-servicebus-eventqueue", this._processMessage.bind(this)), 5000);
}

util.inherits(c2dPublisher, EventEmitter);

c2dPublisher.prototype.sendMessage = function (targetDevice, payload) {
  var self = this;
  self.serviceClient.open(function(err) {
    if (err) {
      console.error('Could not connect: ' + err.message);
    } else {
      self.serviceClient.getFeedbackReceiver(self._receiveFeedback);
      var message = new Message(JSON.stringify(payload));
      message.ack = 'full';
      message.messageId = uuidV4();
      console.log('Sending message: ' + message.getData());
      self.serviceClient.send(targetDevice, message, printResultFor('send'));
      pendingFeedback[targetDevice] = Date.now();
      var timeout = setTimeout(self._sendShoulderTap, 10000, message, targetDevice, self.serviceClient);
    }
  });
};

c2dPublisher.prototype._processMessage = function(err, lockedMsg) {
  //console.log("ProcessMessage ", this);
  var self = this;
  if (err) {
    console.log('Error on Rx: ', err);
  } else {
    //console.log('Message from device ', lockedMsg.body);
    this.emit("message-from-device", lockedMsg.body);
    var deviceId = lockedMsg.customProperties["iothub-connection-device-id"];
    delete pendingFeedback[deviceId];
    serviceBusService.deleteMessage(lockedMsg, function(err2) {
      if (err2) {
        //console.log('Failed to delete message: ', err2);
      } else {
        //console.log('Deleted message.');
      }
    });
  }
};

c2dPublisher.prototype._checkForMessages = function(queueName, handler) {
  //console.log("_checkForMessages ", this);
  var self = this;
  serviceBusService.receiveQueueMessage(queueName, {
    isPeekLock: true
  }, function(err, lockedMessage) {
    if (err) {
      if (err == 'No messages to receive') {
        //console.log('No messages');
      } else {
        handler(err);
      }
    } else {
      handler(null, lockedMessage);
    }
  });
};



c2dPublisher.prototype._sendShoulderTap = function (message, deviceId, serviceClient) {
  var self = this;
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
};


module.exports = c2dPublisher;
