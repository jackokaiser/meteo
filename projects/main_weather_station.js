function main() {
  clearInterval();
  clearWatch();
  var readWriteDelay = 1000 * 1;
  var saveDelay = 1000 * 30;
  var csvDelay = 1000 * 60 * 60 * 24;
  var ccsMode = readWriteDelay < 10000 ? 1 : readWriteDelay < 60000 ? 2 : 3;

  var co2Warn = 2000;
  var humWarn = 55;

  function start(){
    screen.clear();
    screen.drawString("Screen initialized");
    screen.flip();
  }

  I2C1.setup({scl:B6,sda:B7});
  var screen = require("SSD1306").connect(I2C1, start, {contrast: 1});
  var ScreenManager = require("ScreenManager");
  var gas = require("CCS811").connectI2C(I2C1, {int: B4, mode: ccsMode, nWake: B5});
  var dht = require("DHT22").connect(A1);
  var fs = require("fs");

  var sm = new ScreenManager(screen, {vspacing:15, hspacing:50});
  var meteo = new Float32Array(5);

  var csv;
  var createNewCsv = function() {
    var columns = ['chip_temperature', 'temperature', 'humidity', 'co2', 'voc'];
    var now = new Date();
    csv = now + "_" + saveDelay + ".csv";
    console.log("New csv file: " + csv  + " for date " + now.toString());
    fs.writeFileSync(csv, columns.join(','));
  };

  createNewCsv();
  var interCsv = setInterval(createNewCsv, csvDelay);

  var drawScreen = function() {
    sm.clear();
    sm.info("temp ", meteo[1].toFixed(1), ' C');
    sm.info("hum ", meteo[2].toFixed(0), " %");
    sm.info("eCO2 ", meteo[3], " ppm");
    sm.info("VOC ", meteo[4], " ppm");
    if ((meteo[3] > co2Warn) || (meteo[2] > humWarn))
    sm.warn();
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
    drawScreen();
  };

  var interSensor = setInterval(function() {
    dht.read(tempHumCb);
  }, readWriteDelay);

  var interSave = setInterval(function() {
    fs.appendFileSync(csv, meteo.join(','));
  }, saveDelay);
}
E.on('init', main);
main();
