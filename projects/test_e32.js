E32 = require("E32");
Serial1.setup(9600, { tx:B6, rx:B7 });
var lora = new E32(Serial1, {
  M0: C10,
  M1: C11,
  AUX: A0})

lora.setMode('sleep')
.then(function() {
  lora.getVersion();
});