function main() {
  clearInterval();
  clearWatch();
  var readWriteDelay = 1000 * 15;
  var csvDelay = 1000 * 60 * 60 * 24;
  var ccsMode = readWriteDelay < 10000 ? 1 : readWriteDelay < 60000 ? 2 : 3;

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
  var meteo = new Float32Array(5);

  var csv;
  var createNewCsv = function() {
    var columns = ['chip_temperature', 'temperature', 'humidity', 'co2', 'voc'];
    var now = new Date();
    csv = now + ".csv";
    console.log("New csv file: " + csv  + " for date " + now.toString());
    fs.writeFileSync(csv, columns.join(','));
  }
  createNewCsv();
  var interCsv = setInterval(createNewCsv, csvDelay);

  var drawScreen = function() {
    sm.clear();
    sm.info("temp " + meteo[1].toFixed(1));
    sm.info("hum " + meteo[2].toFixed(0) + "%");
    sm.info("CO2 " + meteo[3] + " ppm");
    sm.info("VOC " + meteo[4] + " ppm");
    screen.flip();
  };

  var tempHumCb = function(th) {
    meteo[0] = E.getTemperature();
    meteo[1] = th.temp;
    meteo[2] = th.rh;
    gas.setEnvData(th.temp, th.rh);
    co2 = gas.get();
    meteo[3] = co2.eCO2;
    meteo[4] = co2.TVOC;
    fs.appendFileSync(csv, meteo.join(','));
    drawScreen();
  };

  var interSensor = setInterval(function() {
    dht.read(tempHumCb);
  }, readWriteDelay);
}
E.on('init', main);
main();
