// tslint:disable-next-line: no-import-side-effect
import "phaser"

import { HEIGHT, WIDTH } from "./constant"
import * as Shogi from "../library/shogi/shogi"
import { MainScene } from "./scenes/mainScene"

import * as Colyseus from "colyseus.js"

// デバッグ用の将棋フレームワークのインスタンス
interface IMyWindow extends Window {
  // tslint:disable-next-line: completed-docs
  shogi: Shogi.Shogi
  // tslint:disable-next-line: completed-docs no-any
  c: any
}
declare var window: IMyWindow
// tslint:disable-next-line: no-unsafe-any
window.shogi = new Shogi.Shogi()
// tslint:disable-next-line: no-unsafe-any
window.c = Shogi.Shogi.c

// Main game configuration
const config: Phaser.Types.Core.GameConfig = {
  width: WIDTH,
  height: HEIGHT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  type: Phaser.AUTO,
  parent: "game",
  scene: MainScene
}

/** Game class */
export class Shogiverse extends Phaser.Game {
  public server: Colyseus.Client
  public room: Colyseus.Room

  public constructor(conf: Phaser.Types.Core.GameConfig) {
    super(conf)
    this.server = new Colyseus.Client("ws://localhost:2567")
  }
}

// When the page is loaded, create our game instance
// tslint:disable-next-line: no-unsafe-any
window.addEventListener("load", () => {
  // tslint:disable-next-line: prefer-const
  let game: Shogiverse = new Shogiverse(config)
})
