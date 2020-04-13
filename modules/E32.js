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

function objectFlip(obj) {
  const ret = {};
  Object.keys(obj).forEach(key => {
    ret[obj[key]] = key;
  });
  return ret;
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
};

const FREQ = {
  0x32: 433,
  0x38: 470,
  0x45: 868,
  0x44: 915,
  0x46: 170
};

I_FREQ = objectFlip(FREQ);

const PARITY = {
  0b00: '8N1',
  0b01: '8O1',
  0b10: '8E1',
  0b11: '8N1'
};

I_PARITY = objectFlip(PARITY);

const BAUDRATE = {
  0b000: 1200,
  0b001: 2400,
  0b010: 4800,
  0b011: 9600,
  0b100: 19200,
  0b110: 57600,
  0b111: 115200
};

I_BAUDRATE = objectFlip(BAUDRATE);

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

I_AIRRATE = objectFlip(AIRRATE);

const WAKEUP = {
  0b000: 250,
  0b001: 500,
  0b010: 750,
  0b011: 1000,
  0b100: 1250,
  0b101: 1500,
  0b110: 1750,
  0b111: 2000
};

I_WAKEUP = objectFlip(WAKEUP);

const POWER = {
  0b00: 30,
  0b01: 27,
  0b10: 24,
  0b11: 21
};

I_POWER = objectFlip(POWER);

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
  return new Promise(resolve => {
    if ((nRxBytes) && (nRxBytes > 0)) {
      // We are expecting to receive some bytes of data
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
      airrate: AIRRATE[bytes[3] & 0b00000111]
    },
    CHAN: bytes[4],
    OPTION: {
      transmission: (bytes[5] >> 7) === 0 ? 'transparent' : 'fixed',
      io: (bytes[5] >> 6 & 0b01) === 0 ? 'push-pull' : 'open-collector',
      wakeup: WAKEUP[bytes[5] >> 3 & 0b00001],
      FEC: bytes[5] >> 2 & 0b000001,
      power: POWER[bytes[5] & 0b00000011]
    }
  };
  return this.parameters;
};

E32.prototype.paramsToBytes = function(params) {
  // defaults settings
  var bytes = [0xC0, 0x00, 0x00, 0x1A, 0x17, 0x44];
  if (params.saveOnDown == 0) bytes[0] = 0xC2;
  if (params.ADDH) bytes[1] = params.ADDH;
  if (params.ADDL) bytes[2] = params.ADDL;

  if (params.SPED) {
    if (params.SPED.parity) bytes[3] = (bytes[3] & 0b00111111) | (I_PARITY[params.SPED.parity] << 6);
    if (params.SPED.baudrate) bytes[3] = (bytes[3] & 0b11000111) | (I_BAUDRATE[params.SPED.baudrate] << 3);
    if (params.SPED.airrate) bytes[3] = (bytes[3] & 0b11111000) | (I_AIRRATE[params.SPED.airrate]);
  }
  if (params.CHAN) bytes[4] = params.CHAN;
  if (params.OPTION) {
    if (params.OPTION.transmission == 'fixed') bytes[5] |= 1 << 7;
    if (params.OPTION.io == 'push-pull') bytes[5] &= ~(1 << 6);
    if (params.OPTION.wakeup) bytes[5] = (bytes[5] & 0b00111000) | (I_WAKEUP[params.OPTION.wakeup] << 3);
    if (params.OPTION.FEC == 0) bytes[5] &= ~(1 << 2);
    if (params.OPTION.power) bytes[5] = (bytes[5] & 0b00000011) | (I_POWER[params.OPTION.power]);
  }
  return bytes;
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

E32.prototype.setParams = function(params) {
  var msg = this.paramsToBytes(params);
  if (this.mode === 'sleep') {
    return this.send(msg,1000,6)
  }
  else {
    lastMode = this.mode;
    return this.setMode('sleep')
      .then(()=>this.send(CMD.readParams,1000,6))
      .then(()=>this.reset())
      .then(()=>this.setMode(lastMode))
  }
};

exports = E32;
