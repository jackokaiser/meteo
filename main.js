function main() {
  clearInterval();
  clearWatch();
  var readDelay = 1000 * 2;
  var screenDelay = 1000 * 3;
  var ccsMode = readDelay < 10000 ? 1 : readDelay < 60000 ? 2 : 3;


  function start(){
    screen.drawString("Screen initialized");
    screen.flip();
  }

  I2C1.setup({scl:B6,sda:B7});
  var screen = require("SSD1306").connect(I2C1, start, {contrast: 1});
  var ScreenManager = require("ScreenManager");
  var gas = require("CCS811").connectI2C(I2C1, {int: B4, mode: ccsMode, nWake: B5});
  var dht = require("DHT22").connect(A1);
  var fs = require("fs");

  var sm = new ScreenManager(screen, {fontSize: 10, spacing:15});

  var now = new Date();
  console.log("Meteo station starting: "+now.toString());
  columns = ['temperature', 'humidity', 'co2', 'voc'];
  csv = now + ".csv";
  console.log("csv file: " + csv);
  fs.writeFileSync(csv, columns.join(','));

  var meteo = new Float32Array(4);
  var setTh = function(th) {
    meteo[0] = th.temp;
    meteo[1] = th.rh;
    gas.setEnvData(th.temp, th.rh);
  };  

  var interSensor = setInterval(function() {
    dht.read(setTh);
    co2 = gas.get();
    meteo[2] = co2.eCO2;
    meteo[3] = co2.TVOC;
    fs.appendFileSync(csv, meteo.join(','));
  }, readDelay);

  function ScreenManager (screen, config) {
    config = config ? config : {};
    this.screen = screen;
    this.height = 0;
    this.spacing = config.spacing? config.spacing : 20;
    this.screen.setFontVector(config.fontSize? config.fontSize : 10);
  }

  ScreenManager.prototype.info = function (text) {
    this.screen.drawString(text, 0, this.height);
    this.height += this.spacing;
  };

  ScreenManager.prototype.clear = function () {
    this.screen.clear();
    this.height = 0;
  };

  var interScreen = setInterval(function() {
    sm.clear();
    sm.info("temp " + meteo[0].toFixed(1));
    sm.info("hum " + meteo[1].toFixed(0) + "%");
    sm.info("CO2 " + meteo[2] + " ppm");
    sm.info("VOC " + meteo[3] + " ppm");
    screen.flip();
  }, screenDelay);

  var btnCallback = function(e) {
    digitalWrite(LED2, 1);
    setTimeout(function() {
      digitalWrite(LED2, 0);
    }, 500);
  };

  setWatch(btnCallback, BTN, {repeat:true, edge:'rising', debounce:50});
}
E.on('init', main);
main();



