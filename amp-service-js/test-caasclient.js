var caasClient = require("./aerCaaSClient");

caasClient.getNetworkStatus("1", "3965e581-120d-11e2-8fb3-6362753ec2a5", "AER0000007396636", "naren@aeris.net", function(response) {
  console.log("Response = ", response);
  var dataSession = response.dataSession;
  if (dataSession) {
    var ipAddress = dataSession.ipAddress;
    console.log("IP Address = ", ipAddress);
  }
  var imsi = response.IMSI;
  caasClient.sendSms("1", "3965e581-120d-11e2-8fb3-6362753ec2a5", imsi, function(response){
    console.log("Send SMS resp ", response);
  });

});
