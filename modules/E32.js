/* Copyright (c) 2020 Jacques Kaiser. See the file LICENSE for copying permission. */

function toBytes(d, startIdx) {
  console.log("Converting to bytes");
  var bytes = [];
  for (var i=startIdx; i<d.length; ++i) {
    bytes.push(d.charCodeAt(i))
  }
  return bytes;
};

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
};

const CMD = {
  readParams: [0xC1, 0xC1, 0xC1],
  version: [0xC3, 0xC3, 0xC3],
  reset: [0xC4, 0xC4, 0xC4],
  setTmp: [0xC2],
  setPersistent: [0xC0]
};

const FREQ = {
  0x32: 433,
  0x38: 470,
  0x45: 868,
  0x44: 915,
  0x46: 170
};

const PARITY = {
  0b00: '8N1',
  0b01: '8O1',
  0b10: '8E1',
  0b11: '8N1'
};

const BAUDRATE = {
  0b000: 1200,
  0b001: 2400,
  0b010: 4800,
  0b011: 9600,
  0b100: 19200,
  0b110: 57600,
  0b111: 115200
};

const AIRRATE = {
  0b000: 0.3,
  0b001: 1.2,
  0b010: 2.4,
  0b011: 4.8,
  0b100: 9.6,
  0b101: 19.2,
  0b110: 19.2,
  0b111: 19.2
};

const DEFAULTS = {
  ADDH: 0x00,
  ADDL: 0x00,
  SPED: {
    parity: 0b00,
    baudrate: 0b011,
    airRate: 0b010
  },
  CHAN: 0x00,
  OPTION: {
    transmission: 0b0,
    io: 0b1,
  }
};

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

  this.mode = 'normal';
  this.macOn = true; // are we in LoRaWAN mode or not?

  this.ser.on('data', this.radioRx);
}

E32.prototype.radioRx = function(data) {
  console.log("data from radio: ",data);
};

E32.prototype.receiveCmd = function(nbytes, callback) {
  msg = "";
  var eventCallback = (c) => {
    msg+=c;
    if (msg.length == nbytes) {
      callback(msg);
      this.ser.removeListener('data', eventCallback);
    }
  }
  return eventCallback;
};

E32.prototype.send = function(cmd, timeout, nRxBytes) {
  var msg = ""
  console.log("Making promise ");
  return new Promise(resolve => {
    if ((nRxBytes) && (nRxBytes > 0)) {
      // We are expecting to receive some bytes of data
      console.log("Register callback for "+nRxBytes+" bytes");
      var dataCallback = this.receiveCmd(nRxBytes, resolve);
      this.ser.on('data', dataCallback);
      this.ser.write(cmd);
    }
    else {
      this.ser.write(cmd);
      resolve();
    }
  });
};

E32.prototype.ready = function() {
  return new Promise(resolve => {
    if (digitalRead(this.options.AUX)) resolve();
    else
      setWatch(resolve,
               this.options.AUX,
               { repeat: false, edge: 'rising' })
  });
};

E32.prototype.setMode = function(name) {
  if (this.mode==name) return Promise.resolve();
  this.mode = name;
  if (this.mode === 'sleep') {
    this.ser.removeListener('data', this.radioRx);
  }
  else {
    this.ser.on('data', this.radioRx);
  }

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
      .then(()=>this.send(CMD.reset,1000))
      .then(()=>this.ready())
      .then(()=>this.setMode(lastMode));
  }
};

E32.prototype.parseVersion = function(d) {
  if (d===undefined) return;

  var bytes = toBytes(d, 1);
  this.version = {
    frequency: FREQ[bytes[0]],
    version: bytes[1],
    other: bytes[2]
  };
  return this.version;
};

E32.prototype.parseParams = function(d) {
  if (d===undefined) return;

  var bytes = toBytes(d, 0);
  this.parameters = {
    saveOnDown: bytes[0] === 0xC0,
    ADDH: bytes[1],
    ADDL: bytes[2],
    SPED: {
      parity: PARITY[bytes[3] >> 6],
      baudrate: BAUDRATE[bytes[3] >> 3 & 0b00111],
      airRate: AIRRATE[bytes[3] & 0b00000111]
    },
    CHAN: bytes[4],
    OPTION: bytes[5]
  };
  return this.parameters;
};

// switch to sleep mode, get version and go back to previous mode
E32.prototype.getVersion = function() {
  if (this.mode === 'sleep') {
    return this.send(CMD.version,1000,4)
      .then(this.parseVersion)
  }
  else {
    lastMode = this.mode;
    return this.setMode('sleep')
      .then(()=>this.send(CMD.version,1000,4))
      .then((d)=>this.parseVersion(d))
      .then(()=>this.setMode(lastMode))
      .then(()=>this.version)
  }
};

E32.prototype.getParams = function() {
  if (this.mode === 'sleep') {
    return this.send(CMD.readParams,1000,6)
      .then(this.parseParams)
  }
  else {
    lastMode = this.mode;
    return this.setMode('sleep')
      .then(()=>this.send(CMD.readParams,1000,6))
      .then((d)=>this.parseParams(d))
      .then(()=>this.setMode(lastMode))
      .then(()=>this.parameters)
  }
};

// E32.prototype.setParams = function(params, persistent) {
//   msg = paramsToMsg(params);
//   setCmd = persistent ? CMD.setPersistent : CMD.setTmp;
//   if (this.mode === 'sleep') {
//     return this.send(setCmd.concat(msg),1000)
//       .then(this.parseParams)
//   }
//   else {
//     lastMode = this.mode;
//     return this.setMode('sleep')
//       .then(()=>this.send(CMD.readTmpParams,1000))
//       .then((d)=>this.parseParams(d))
//       .then(()=>this.setMode(lastMode))
//       .then(()=>this.parameters)
//   }

exports = E32;
