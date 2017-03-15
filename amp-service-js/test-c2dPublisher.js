var c2dtest = require("./c2dPublisher.js");
var payload = {"op": "getTemp","ts":123123123};

c2dtest.sendMessage("AMP-device", payload);

console.log('Press any key to exit');
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', function() {
  process.exit(0);
});
