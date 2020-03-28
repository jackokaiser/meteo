function ScreenManager (screen) {
  this.screen = screen;
  this.height = 0;
  // require("Font8x16").add(Graphics);
  // this.screen.setFont8x16();

  require("FontHaxorNarrow7x17").add(Graphics);
  this.screen.setFontHaxorNarrow7x17();

  this.preSpace = this.screen.stringWidth("eCO2  ");
  this.valSpace = this.screen.stringWidth("55.5 ");

  this.warningImg = {
    width : 18, height : 18, bpp : 1,
    buffer : E.toArrayBuffer(atob("AAAAMAAeAASAAzABtgBtgDMwDMwGMYMMMMMMYAGYMGwMDwAD///AAAA="))
  };
  this.warnSpace = this.screen.getWidth() - this.warningImg.height;
}

ScreenManager.prototype.info = function (pre, val, post) {
  this.screen.drawString(pre, 0, this.height);
  this.screen.drawString(val, this.preSpace, this.height);
  this.screen.drawString(post, this.preSpace + this.valSpace, this.height);
  this.height += 15;
};

ScreenManager.prototype.clear = function () {
  this.screen.clear();
  this.height = 0;
};

ScreenManager.prototype.warn = function () {
  this.screen.drawImage(this.warningImg, this.warnSpace, 0);
};

exports = ScreenManager;
