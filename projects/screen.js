function start(){
  //require("Font8x16").add(Graphics);
  //screen.setFont8x16();

  require("FontCherry6x10").add(Graphics);
  screen.FontCherry6x10();


  // write some text
  screen.drawString("Temp is 33°",2,2);
  // write to the screen
  screen.flip();
}

I2C1.setup({scl:B6,sda:B7});
var screen = require("SSD1306").connect(I2C1, start);
console.log(screen instanceof Graphics);
