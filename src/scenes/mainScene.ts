import { CELL_SIZE, HEIGHT, PIECE_SIZE, WIDTH } from "../constant"
import { Board } from "../library/shogi/board"
import { Piece, PieceType } from "../library/shogi/piece"
import { Player } from "../library/shogi/player";
import { Shogi } from "../library/shogi/shogi"
import { Point } from "../library/shogi/util";

type Sprite = Phaser.GameObjects.Sprite
type Container = Phaser.GameObjects.Container

class PieceSprite extends Phaser.GameObjects.Sprite {
  public readonly piece: Piece
  public constructor(
    piece: Piece,
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number | undefined
  ) {
    super(scene, x, y, texture, frame)
    this.piece = piece
  }
}

class SpriteBoard extends Board<Sprite | null> {
  public static init(arr: Array<Array<Sprite | null>>): SpriteBoard {
    const board = new SpriteBoard()
    board.resetByArray(arr)
    return board
  }
}

/**
 * 将棋対戦画面
 */
export class MainScene extends Phaser.Scene {
  private readonly shogi: Shogi
  private board: Container
  private background: Sprite
  private boardPieceSprites: SpriteBoard

  public constructor() {
    super({key: "MainScene"})
    this.shogi = new Shogi()
  }

  public preload(): void {
    this.load.image("board", "../../assets/image/syougi_ban.png")
    this.load.image(`${PieceType.King}`, "../../assets/image/syougi01_ousyou.png")
    this.load.image(`${PieceType.King}*`, "../../assets/image/syougi02_gyokusyou.png")
    this.load.image(`${PieceType.Rook}`, "../../assets/image/syougi03_hisya.png")
    this.load.image(`${PieceType.Rook}+`, "../../assets/image/syougi04_ryuuou.png")
    this.load.image(`${PieceType.Bishop}`, "../../assets/image/syougi05_gakugyou.png")
    this.load.image(`${PieceType.Bishop}+`, "../../assets/image/syougi06_ryuuma.png")
    this.load.image(`${PieceType.GoldGeneral}`, "../../assets/image/syougi07_kinsyou.png")
    this.load.image(`${PieceType.SilverGeneral}`, "../../assets/image/syougi08_ginsyou.png")
    this.load.image(`${PieceType.SilverGeneral}+`, "../../assets/image/syougi09_narigin.png")
    this.load.image(`${PieceType.Knight}`, "../../assets/image/syougi10_keima.png")
    this.load.image(`${PieceType.Knight}+`, "../../assets/image/syougi11_narikei.png")
    this.load.image(`${PieceType.Lance}`, "../../assets/image/syougi12_kyousya.png")
    this.load.image(`${PieceType.Lance}+`, "../../assets/image/syougi13_narikyou.png")
    this.load.image(`${PieceType.Pawn}`, "../../assets/image/syougi14_fuhyou.png")
    this.load.image(`${PieceType.Pawn}+`, "../../assets/image/syougi15_tokin.png")
  }

  public create(): void {
    this.background = this.add.sprite(WIDTH / 2, HEIGHT / 2, "board").setDisplaySize(HEIGHT, HEIGHT)
    this.board = this.add.container(WIDTH / 2 - CELL_SIZE * 4, HEIGHT / 2 - CELL_SIZE * 4)
    this.boardPieceSprites = SpriteBoard.init(
      this.shogi.board.matMap((piece, pos) => {
        if (piece === null) { return null }
        const sprite = new PieceSprite(
          piece,
          this,
          pos.x * CELL_SIZE,
          pos.y * CELL_SIZE,
          piece.type
          + (piece.isPromote ? "+" : "")
          + (piece.type === PieceType.King && piece.owner === Player.White ? "*" : "")
        )
        sprite.displayHeight = PIECE_SIZE
        sprite.displayWidth = PIECE_SIZE * (sprite.width / sprite.height)
        if (piece.owner === Player.White) { sprite.angle = 180 }
        this.board.add(sprite)
        sprite.setInteractive()
        this.input.setDraggable(sprite)
        return sprite
      })
    )

    this.input.on("dragstart", (pointer: any, gameObject: Sprite) => {
      if (gameObject instanceof PieceSprite) {
        gameObject.depth = 1
      }
    })

    this.input.on("drag", (pointer: any, gameObject: Sprite, dragX: number, dragY: number) => {
      if (gameObject instanceof PieceSprite) {
        gameObject.x = dragX;
        gameObject.y = dragY;
      }
    })

    this.input.on("dragend", (pointer: any, gameObject: Sprite) => {
      if (gameObject instanceof PieceSprite) {
        gameObject.depth = 0
        const to: Point = {
          x: Math.round(gameObject.x / CELL_SIZE),
          y: Math.round(gameObject.y / CELL_SIZE)
        }
        const from = this.shogi.getPosition(gameObject.piece) as Point
        const res = this.shogi.move(from, to)
        console.log("move res: ", res)
        if (res.type === "move_error") {
          gameObject.x = from.x * CELL_SIZE
          gameObject.y = from.y * CELL_SIZE
          return
        }
        gameObject.x = to.x * CELL_SIZE
        gameObject.y = to.y * CELL_SIZE
        const takedPiece = this.boardPieceSprites.at(to)
        if (takedPiece !== null) {
          takedPiece.destroy()
        }
        this.boardPieceSprites.assign(to, gameObject)
        this.boardPieceSprites.assign(from, null)
      }
    })
  }

  public update(): void {
    //
  }
}
