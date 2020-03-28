function ScreenManager (screen, config) {
  config = config ? config : {};
  this.screen = screen;
  this.height = 0;
  this.vspacing = config.vspacing? config.vspacing : 15;
  this.hspacing = config.hspacing? config.hspacing : 50;
  require("Font8x16").add(Graphics);
  this.screen.setFont8x16();

  this.warningImg = {
    width : 18, height : 18, bpp : 1,
    buffer : E.toArrayBuffer(atob("AAAAMAAeAASAAzABtgBtgDMwDMwGMYMMMMMMYAGYMGwMDwAD///AAAA="))
  }
}

ScreenManager.prototype.info = function (pre, val, post) {
  this.screen.drawString(pre, 0, this.height);
  this.screen.drawString(val, this.hspacing, this.height);
  this.screen.drawString(post, this.screen.stringWidth("55.5") + this.hspacing, this.height);
  this.height += this.vspacing;
};

ScreenManager.prototype.clear = function () {
  this.screen.clear();
  this.height = 0;
};

ScreenManager.prototype.warn = function () {
  this.screen.drawImage(this.warningImg, 100, 0);
};


exports = ScreenManager;
