var request = require("request");
var WebSocket = require("ws");
var wol = require("wake_on_lan");

function SamsungTV(macAddress, ipAddress, port, appName) {
  this.macAddress = macAddress;
  this.ipAddress = ipAddress;
  this.port = port;
  this.appName = appName;
  this.encodedAppName = new Buffer(this.appName).toString("base64");
}

exports.module = SamsungTV;

SamsungTV.prototype.getServices = function() {
  var switchService = new Service.Switch(this.name);
  switchService
    .getCharacteristic(Characteristic.On)
    .on("set", this.setPowerState.bind(this))
    .on("get", this.isOn.bind(this));
  return [ switchService ]
}

SamsungTV.prototype.sendKey = function(key, callback) {
  var url = "http://" + this.ipAddress + ":8001/api/v2/channels/samsung.remote.control?name=" + this.encodedAppName;
  var ws = new WebSocket(url, callback);
  ws.on("error", callback);
  ws.on("message", function(data, flags) {
    var cmd = {
      "method": "ms.remote.control",
      "params": {
        "Cmd": "Click",
        "DataOfCmd": key,
        "Option": "false",
        "TypeOfRemote": "SendRemoteKey"
      }
    };
    data = JSON.parse(data);
    if (data.event == "ms.channel.connect") {
      ws.send(JSON.stringify(cmd), callback);
    }
  });
}

SamsungTV.prototype.waitForTVOn = function(attemptsLeft, callback) {
  var accessory = this;
  wol.wake(this.macAddress, function(err) {
    accessory.isOn(function(err, isOn) {
      if (isOn) {
        callback();
      } else if (attemptsLeft > 0) {
        setTimeout(function() {
          accessory.waitForTVOn(attemptsLeft - 1, callback);
        }, 2000);
      } else {
        callback("Unable to turn on Samsung TV.");
      }
    });
  });
}

SamsungTV.prototype.turnOn = function(callback) {
  this.waitForTVOn(3, callback);
}

SamsungTV.prototype.turnOff = function(callback) {
  this.sendKey("KEY_POWER", callback);
}

SamsungTV.prototype.isOn = function(callback) {
  var url = "http://" + this.ipAddress + ":" + this.port + "/api/v2/";
  return request.get(url, { timeout: 5000 }, function(err, httpResponse, body) {
    if (err || httpResponse.statusCode != 200) {
      callback(null, false);
    } else {
      callback(null, true);
    }
  });
}

