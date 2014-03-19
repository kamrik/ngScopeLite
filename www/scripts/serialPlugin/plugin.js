function createSerialPlugin(name) {
var serialPlugin = new  basePlugin(name);

serialPlugin.maxValue=1024;
serialPlugin.minValue=0;
serialPlugin.callbacksAdded=false;

if(typeof(cordova)!=="undefined") {
  serialPlugin.serial=window.serial;
  chrome.serial=null;
} else {
  // using chrome.serial
  serialPlugin.serial=null;
  chrome.serial.onReceive.addListener(serialPlugin.onReceiveCallback);
  chrome.serial.onReceiveError.addListener(serialPlugin.onErrorCallback);
}

serialPlugin.initBuffer = function() {
  serialPlugin.close( function(success){
    console.log('Serial Open started');
    if(serialPlugin.controls.port.value) {
      serialPlugin.open(function(success) {
        console.log('Serial Opened');
      });
    } else {
      console.log('skipping Serial Open');
    }
  });
}
serialPlugin.open = function(callback) {
  if(!!serialPlugin.serial) {
    console.log('Open Mobile started');
    var opts = {baudRate:9600, dataBits:8, stopBits:1, parity:0};
    serial.requestPermission(function(){
      serial.open(opts, function success() {
        self.readTimer = setInterval(serialPlugin.onMobileRead,100);
        callback(true);
      }, error());
    });
  } else {
    var bitrate = serialPlugin.getBitrate();
    console.log('Open Chrome started: ',serialPlugin.controls.port.value,' at ',bitrate);
    try {
     chrome.serial.connect(serialPlugin.controls.port.value, {bitrate: bitrate}, function(connectionInfo){
      console.log('Open Chrome ok',connectionInfo);
      serialPlugin.connectionId = connectionInfo.connectionId;
      if(!serialPlugin.callbacksAdded) {
        chrome.serial.onReceive.addListener(serialPlugin.onReceiveCallback);
        chrome.serial.onReceiveError.addListener(serialPlugin.onErrorCallback);
        serialPlugin.callbacksAdded=true;
      }
      console.log('Open Chrome complete');
      callback(true);
     });
    } catch(e) {
      console.log(e);
    }
  }
  function error(e) {
    console.log("Serial Open failed: ",e);
    callback(false);
  }
}
serialPlugin.getBitrate = function() {
  var br = parseInt(serialPlugin.controls.bitrate.value);
  return br;
}

serialPlugin.wordBuf=0;
serialPlugin.parseData = function(buf) {
  for(var i=0;i< buf.length;i++) {
    if(buf[i] >127) { //have top byte
      d = ((buf[i] & 0x3F)<<6) | serialPlugin.wordBuf;
      serialPlugin.pushData(d);
      serialPlugin.wordBuf=0;
    } else {
      serialPlugin.wordBuf = buf[i] & 0x3F;
    }
  }
}
serialPlugin.pushData = function(byte) {
  serialPlugin.data[serialPlugin.buffertail]=byte;
  serialPlugin.buffertail= (serialPlugin.buffertail+1)%serialPlugin.bufferSize;
  serialPlugin.bufferhead= (serialPlugin.buffertail+1)%serialPlugin.bufferSize;
}

serialPlugin.onErrorCallback = function(errorInfo) {
  console.log('Serial Error: ',errorInfo.error);
}

serialPlugin.onReceiveCallback = function(connectionInfo) {
  if(connectionInfo.connectionId != serialPlugin.connectionId) {
    console.log('Cdata callback for wrong id');
  } else {
    var uint8data = new Uint8Array(connectionInfo.data)
    if (connectionInfo.data) serialPlugin.parseData(uint8data);
  }
}

serialPlugin.onMobileRead = function(){
  serial.read(function(numBytes, data) {
    if(numBytes) serialPlugin.queueData(data);
  }, function(e) {
    console.log("Serial Mobile Read error: ",e);
  });
}

serialPlugin.close = function(callback) {
  if(serialPlugin.connectionId) {
    if(serialPlugin.serial) {
      serialPlugin.connectionId=null;
      clearInterval(self.readTimer);
      serial.close(function success() {
        // nothing to do.
        callback(true);
      }, function error(e) {
        console.log("Serial Close failed: ",e);
        callback(false);
      });
    } else {
      chrome.serial.disconnect(serialPlugin.connectionId, function(result) {
        serialPlugin.connectionId=null;
        if (result) {
          console.log("Disconnected from the serial port");
          callback(true);
        } else {
          console.log("Disconnect failed");
          callback(false);
        }
      });
    }
  } else {
    callback(true);
  }
}

serialPlugin.enumeratePorts = function(callback) {
  if(serialPlugin.serial) {
    serialPlugin.controls.port.choices=['default'];
    callback();
  } else {
    serialPlugin.controls.port.choices=[];
    chrome.serial.getDevices(function(ports) {
      for (var i=0; i<ports.length; i++) {
        serialPlugin.controls.port.choices.push(ports[i].path);
        console.log(ports[i].path);
      }
      callback();
    });
  }
}

serialPlugin.getControls = function(callback){
  console.log("starting getControls");
  serialPlugin.enumeratePorts(function(){
    console.log("ending getControls");
    callback(serialPlugin.controls);
  });
}

serialPlugin.controls.port =  { datatype : 'select', label: 'Port', units : 'port', choices : [],  value : '', defaultValue : '' , readonly: false};
serialPlugin.controls.bitrate =  { datatype : 'select', label: 'Bitrate', units : 'b/s', choices : ['2400', '4800', '9600', '14400', '19200', '38400', '57600', '115200'],  value : '9600', defaultValue : '9600' , readonly: false};

return serialPlugin;
}

