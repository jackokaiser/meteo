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


exports = ScreenManager;
