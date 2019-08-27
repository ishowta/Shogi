import "phaser";
import { MainScene } from "./src/scenes/mainScene";

// デバッグ用の将棋フレームワークのインスタンス
import * as Shogi from "./src/library/shogi/shogi";
interface MyWindow extends Window {
  shogi: Shogi.Shogi
}
declare var window: MyWindow;
window.shogi = new Shogi.Shogi();

// main game configuration
const config: Phaser.Types.Core.GameConfig = {
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  type: Phaser.AUTO,
  parent: "game",
  scene: MainScene
};

// game class
export class Game extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}

// when the page is loaded, create our game instance
window.addEventListener("load", () => {
  var game = new Game(config);
});
