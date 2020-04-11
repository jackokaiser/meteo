/* Copyright (c) 2016 Gordon Williams, Pur3 Ltd. See the file LICENSE for copying permission. */

function toHex(m) {
  m = E.toString(m);
  var hex = "";
  for (var i in m)
    hex += (m.charCodeAt(i)+256).toString(16).substr(-2);
  return hex;
}

function toBytes(d, startIdx) {
  var bytes = [];
  for (var i=0; i<d.length; ++i) {
    bytes.push(d.charCodeAt(i))
  }
  return bytes;
}

function waiter(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
};

// M0 and M1 in binary
const MODE = {
  normal: 0b00,
  powerSaving: 0b01,
  wakeUp: 0b10,
  sleep: 0b11
}

const CMD = {
  version: [0xC3, 0xC3, 0xC3],
  reset: [0xC4, 0xC4, 0xC4]
}

const FREQ = {
  0x32: 433,
  0x38: 470,
  0x45: 868,
  0x44: 915,
  0x46: 170
}


/** Connect to a E32.
  First argument is the serial device, second is an
  object containing:

  {
    reset : pin // optional
    debug : true // optional
    M0 : pin // optional
    M1 : pin // optional
    AUX : pin // optional
  }
*/
function E32(serial, options) {
  this.ser = serial;
  this.options = options||{};
  this.at = require("AT").connect(serial);
  this.mode = 'normal';
  if (this.options.debug) this.at.debug();
  this.macOn = true; // are we in LoRaWAN mode or not?
}

E32.prototype.send = function(cmd, timeout) {
  return new Promise(resolve => this.at.cmd(cmd,timeout,resolve));
};

E32.prototype.ready = function() {
  return new Promise(resolve => setWatch(resolve,
                                         this.options.AUX,
                                         { repeat: false, edge: 'rising' }));
};

E32.prototype.setMode = function(name) {
  this.mode = name;
  console.log("Changing mode to "+name);
  digitalWrite([this.options.M0,this.options.M1], MODE[name]);
  return waiter(1);
};

// switch to sleep mode, reset and go back to previous mode
E32.prototype.reset = function() {
  if (this.mode === 'sleep') {
    return this.send(CMD.reset,1000)
      .then(()=>this.ready());
  }
  else {
    lastMode = this.mode;
    return this.setMode('sleep')
      .bind(this)
      .then(()=>this.send(CMD.reset,1000))
      .then(()=>this.ready())
      .then(()=>this.setMode(lastMode));
  }
};

E32.prototype.parseVersion = function(d) {
  if (d===undefined) return;

  var bytes = toBytes(d);
  this.version = {
    frequency: FREQ[bytes[1]],
    version: bytes[2],
    other: bytes[3]
  };
  return this.version;
};

// switch to sleep mode, get version and go back to previous mode
E32.prototype.getVersion = function() {
  if (this.mode === 'sleep') {
    return this.send(CMD.version,1000)
      .then(this.parseVersion)
  }
  else {
    lastMode = this.mode;
    return this.setMode('sleep')
      .then(()=>this.send(CMD.version,1000))
      .then((d)=>this.parseVersion(d))
      .then(()=>this.setMode(lastMode))
      .then(()=>this.version)
  }
};


// /** Call the callback with the current status as an object.
//  Includes: EUI, VDD, appEUI, devEUI, band, dataRate, rxDelay1 and rxDelay2 */
// E32.prototype.getStatus = function(callback) {
//   var status = {};
//   var at = this.at;

//   (new Promise(function(resolve) {
//     at.cmd("sys get hweui\r\n",500,resolve);
//   })).then(function(d) {
//     status.EUI = d;
//     return new Promise(function(resolve) {
//       at.cmd("sys get vdd\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.VDD = parseInt(d,10)/1000;
//     return new Promise(function(resolve) {
//       at.cmd("mac get appeui\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.appEUI = d;
//     return new Promise(function(resolve) {
//       at.cmd("mac get deveui\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.devEUI = d;
//     return new Promise(function(resolve) {
//       at.cmd("mac get band\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.band = d;
//     return new Promise(function(resolve) {
//       at.cmd("mac get dr\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.dataRate = d;
//     return new Promise(function(resolve) {
//       at.cmd("mac get rxdelay1\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.rxDelay1 = d;
//     return new Promise(function(resolve) {
//       at.cmd("mac get rxdelay2\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.rxDelay2 = d;
//     return new Promise(function(resolve) {
//       at.cmd("mac get rx2 868\r\n",500,resolve);
//     });
//   }).then(function(d) {
//     status.rxFreq2_868 = d;
//     callback(status);
//   });
// };

// /** configure the LoRaWAN parameters
//  devAddr = 4 byte address for this device as hex - eg. "01234567"
//  nwkSKey = 16 byte network session key as hex - eg. "01234567012345670123456701234567"
//  appSKey = 16 byte application session key as hex - eg. "01234567012345670123456701234567"
// */
// E32.prototype.LoRaWAN = function(devAddr,nwkSKey,appSKey, callback)
// {
//   var at = this.at;
//   (new Promise(function(resolve) {
//     at.cmd("mac set devaddr "+devAddr+"\r\n",500,resolve);
//   })).then(function() {
//     return new Promise(function(resolve) {
//       at.cmd("mac set nwkskey "+nwkSKey+"\r\n",500,resolve);
//     });
//   }).then(function() {
//     return new Promise(function(resolve) {
//       at.cmd("mac set appskey "+appSKey+"\r\n",500,resolve);
//     });
//   }).then(function() {
//     return new Promise(function(resolve) {
//       at.cmd("mac join ABP\r\n",2000,resolve);
//     });
//   }).then(function(d) {
//     callback((d=="ok")?null:((d===undefined?"Timeout":d)));
//   });
// };

// /// Set whether the MAC (LoRaWan) is enabled or disabled
// E32.prototype.setMAC = function(on, callback) {
//   if (this.macOn==on) return callback();
//   this.macOn = on;
//   this.at.cmd("mac "+(on?"resume":"pause")+"\r\n",500,callback);
// };

// /// Transmit a message over the radio (not using LoRaWAN)
// E32.prototype.radioTX = function(msg, callback) {
//   var at = this.at;
//   this.setMAC(false, function() {
//     // convert to hex
//     at.cmd("radio tx "+toHex(msg)+"\r\n",2000,callback);
//   });
// };

// /** Transmit a message (using LoRaWAN). Will call the callback with 'null'
// on success, or the error message on failure.

// In LoRa, messages are received right after data is transmitted - if
// a message was received, the 'message' event will be fired, which
// can be received if you added a handler as follows:

// lora.on('message', function(data) { ... });
//  */
// E32.prototype.loraTX = function(msg, callback) {
//   var at = this.at;
//   this.setMAC(true, function() {
//     // convert to hex
//     at.cmd("mac tx uncnf 1 "+toHex(msg)+"\r\n",2000,function(d) {
//       callback((d=="ok")?null:((d===undefined?"Timeout":d)));
//     });
//   });
// };


// /** Receive a message from the radio (not using LoRaWAN) with the given timeout
// in miliseconds. If the timeout is reached, callback will be called with 'undefined' */
// E32.prototype.radioRX = function(timeout, callback) {
//   var at = this.at;
//   this.setMAC(false, function() {
//     at.cmd("radio set wdt "+timeout+"\r\n", 500, function() {
//       at.cmd("radio rx 0\r\n", timeout+500, function cb(d) {
//         if (d=="ok") return cb;
//         if (d===undefined || d.substr(0,10)!="radio_rx  ") { callback(); return; }
//         callback(fromHex(d,10));
//       });
//     });
//   });
// };

exports = E32;
