function main() {
  clearInterval();
  clearWatch();
  var rw_d = 1;
  var s_d = 30;
  var csv_d = 60 * 60 * 24;

  function start(){
    screen.clear();
    screen.flip();
  }

  I2C1.setup({scl:B6,sda:B7});
  var screen = require("SSD1306").connect(I2C1, start);
  var ScreenManager = require("ScreenManager");
  var gas = require("CCS811").connectI2C(I2C1, {
    int: B4,
    mode: rw_d < 10 ? 1 : rw_d < 60 ? 2 : 3,
    nWake: B5
  });
  var dht = require("DHT22").connect(A1);
  var fs = require("fs");

  var sm = new ScreenManager(screen);
  var meteo = new Float32Array(5);

  var csv;
  var newCsv = function() {
    var columns = ['chip_temp', 'temp', 'humidity', 'eCO2', 'VOC'];
    var now = new Date();
    csv = now + "_" + s_d + ".csv";
    console.log("New csv file: " + csv  + " for date " + now.toString());
    fs.writeFileSync(csv, columns.join(','));
  };

  newCsv();

  var drawScreen = function() {
    sm.clear();
    sm.info("temp ", meteo[1].toFixed(1), ' °');
    sm.info("hum ", meteo[2].toFixed(0), " %");
    sm.info("eCO2 ", meteo[3], " ppm");
    sm.info("VOC ", meteo[4], " ppm");
    if ((meteo[3] > 2000) || (meteo[2] > 55)) {
      sm.warn();
    }
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

  setInterval(newCsv, csv_d * 1000);

  setInterval(function() {
    dht.read(tempHumCb);
  }, rw_d * 1000);

  setInterval(function() {
    fs.appendFileSync(csv, meteo.join(','));
  }, s_d * 1000);
}
E.on('init', main);
