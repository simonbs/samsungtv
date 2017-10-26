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

module.exports = SamsungTV;

SamsungTV.prototype.sendKey = function(key, callback) {
  var url = "http://" + this.ipAddress + ":8001/api/v2/channels/samsung.remote.control?name=" + this.encodedAppName
  var ws = new WebSocket(url, callback)
  ws.on("error", callback)
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
    data = JSON.parse(data)
    if (data.event == "ms.channel.connect") {
      ws.send(JSON.stringify(cmd), callback)
    }
  })
}

SamsungTV.prototype.waitForTVOn = function(attemptsLeft, callback) {
  var accessory = this;
  wol.wake(this.macAddress, function(err) {
    accessory.isOn(function(err, isOn) {
      if (isOn) {
        callback()
      } else if (attemptsLeft > 0) {
        setTimeout(function() {
          accessory.waitForTVOn(attemptsLeft - 1, callback)
        }, 2000)
      } else {
        callback("Unable to turn on Samsung TV.")
      }
    })
  })
}

SamsungTV.prototype.turnOn = function(callback) {
  this.waitForTVOn(3, callback)
}

SamsungTV.prototype.turnOff = function(callback) {
  this.sendKey("KEY_POWER", callback)
}

SamsungTV.prototype.isOn = function(callback) {
  var url = "http://" + this.ipAddress + ":" + this.port + "/api/v2/"
  return request.get(url, { timeout: 5000 }, function(err, httpResponse, body) {
    if (err || httpResponse.statusCode != 200) {
      callback(null, false)
    } else {
      callback(null, true)
    }
  })
}

SamsungTV.prototype.volumeUp = function(callback) {
  this.sendKey("KEY_VOLUP", callback)
}

SamsungTV.prototype.volumeDown = function(callback) {
  this.sendKey("KEY_VOLDOWN", callback)
}

SamsungTV.prototype.changeVolume = function(volumeChange, callback) {
  if (volumeChange != 0) {
    var samsungtv = this
    var key = volumeChange > 0 ? "KEY_VOLUP" : "KEY_VOLDOWN"
    this.sendKey(key, function(error) {
      if (error) {
        return callback(error)
      } else {
        setTimeout(function() {
          var next = volumeChange > 0 ? volumeChange-1 : volumeChange+1
          samsungtv.changeVolume(next, callback)
        }, 1000)
      }
    })
  } else {
    callback()
  }
}

SamsungTV.prototype.toggleMute = function(callback) {
  this.sendKey("KEY_MUTE", callback)
}

