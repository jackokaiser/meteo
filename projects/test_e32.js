
function testSerial() {
  console.log("Testing serial connection");
  setWatch(console.log, A0, {repeat:true, edge:'both'});
  digitalWrite([C10,C11],0b11);
  Serial1.setup(9600, { tx:B6, rx:B7, errors:true });
  function pureSerialTest() {
    Serial1.on('data', function (data) {
      console.log("data from serial: "+data);
    });
    Serial1.on('framing', function (data) {
      console.log("framing error: "+data);
    });
    Serial1.on('parity', function (data) {
      console.log("parity error: "+data);
    });
    Serial1.write([0xC3,0xC3,0xC3]);
  }
  //pureSerialTest();
  function atTest() {
    at = require("AT").connect(Serial1);
    at.cmd([0xc3, 0xc3, 0xc3],1000,console.log);
  }
  atTest();
}

//testSerial();

console.log("Testing E32 module");

E32 = require("E32");
Serial1.setup(9600, { tx:B6, rx:B7});
var lora = new E32(Serial1, {
  M0: C10,
  M1: C11,
  AUX: A0,
  debug: false
});

/*
lora.reset()
.then(lora.getVersion)
.then(function(data) {
  console.log("After all this work, version is: "+data);
});
*/
//lora.getVersion()
//.then(console.log);

lora.getVersion()
.then(v=>console.log(v));