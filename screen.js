function start(){
 // write some text
 screen.drawString("Hello World!",2,2);
 // write to the screen
 screen.flip();
}

I2C1.setup({scl:B6,sda:B7});
var screen = require("SSD1306").connect(I2C1, start);
