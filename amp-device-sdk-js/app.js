var sdk = require('./amp-device-sdk.js');

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

sdk.subscribe(function(message) {
  if (message) {
    var payload = JSON.parse(message);
    switch(payload.op) {
      case 'getTemp':
        var temp = getRandomArbitrary(-10, 70);
        var payload = {
          "op": "tempResp",
          "ts": Date.now(),
          "data": {
            "value": temp,
            "unit": "K"
          }
        };
        sdk.publish(payload, function(err) {
          if (err) {
            console.log("Failed to publish. Error ", err);
          }
        });
        break;
      default:
        console.log('Unexpected Message ', payload);
        break;
    }
  }
});
