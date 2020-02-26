var readDelay = 1000 * 2;
var screenDelay = 1000 * 3;
var ccsMode = readDelay < 10000 ? 1 : readDelay < 60000 ? 2 : 3;

function start(){
 // write some text
 screen.drawString("Hello World!",2,2);
 // write to the screen
 screen.flip();
}

I2C1.setup({scl:B6,sda:B7});
var screen = require("SSD1306").connect(I2C1, start);
var dht = require("DHT22").connect(A1);
var gas = require("CCS811").connectI2C(I2C1, {int: B4, mode: ccsMode, nWake: B5});

var now = new Date();
console.log("Meteo station starting: "+now.toString());
  
var meteo = new Float32Array(4);
var setTh = function(th) {
  meteo[0] = th.temp;
  meteo[1] = th.rh;
  gas.setEnvData(th.temp, th.rh);
};  
  
var interSensor = setInterval(function() {
  dht.read(setTh);
  co2 = gas.get();
  meteo[2] = co2.sueCO2;
  meteo[3] = co2.TVOC;
}, readDelay);
  
var interScreen = setInterval(function() {
  console.log("temp: " + meteo[0] + "\n" +
             "humidity: " + meteo[1] + "\n" +
             "CO2: " + meteo[2] + "\n" +
             "VOC: " + meteo[3] + "\n");
}, screenDelay);
  
var btnCallback = function(e) {
  digitalWrite(LED2, 1);
  setTimeout(function() {
    digitalWrite(LED2, 0);
  }, 500);
};
  
setWatch(btnCallback, BTN, {repeat:true, edge:'rising', debounce:50});






