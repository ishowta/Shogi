import { CELL_SIZE, HEIGHT, PIECE_SIZE, WIDTH } from "../constant"
import { Board } from "../../library/shogi/board"
import { ShogiError } from "../../library/shogi/errors"
import { Piece , PieceType } from "../../library/shogi/piece"
import { Player } from "../../library/shogi/player"
import { Shogi } from "../../library/shogi/shogi"
import { isSameInstance, Point } from "../../library/shogi/util"
import { Shogiverse } from "../game"
import { Message, MoveMessage } from "../../messageTypes"
import * as Scheme from "../../server/schemes"

type Sprite = Phaser.GameObjects.Sprite
type Container = Phaser.GameObjects.Container

class PieceSprite extends Phaser.GameObjects.Sprite {
  public currentBoardPosition: Point

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number | undefined
  ) {
    super(scene, x, y, texture, frame)
    this.currentBoardPosition = {x, y}
  }

  public setNewBoardPosition(newPos: Point): void {
    this.setPosition(newPos.x, newPos.y)
    this.currentBoardPosition = {x: newPos.x, y: newPos.y}
  }

  public resetByBoardPosition(): void {
    this.setPosition(this.currentBoardPosition.x, this.currentBoardPosition.y)
  }

  public moveToHand(index: integer, player: Player): void {
    this.angle += 180
    switch (player) {
      case Player.Black:
        this.setNewBoardPosition({
          x: CELL_SIZE * (8 + index + 2),
          y: CELL_SIZE * 8
        })
        break
      case Player.White:
        this.setNewBoardPosition({
          x: CELL_SIZE * (0 - index - 2),
          y: 0
        })
        break
    }
    return
  }
}

type PieceAndPieceSpriteLinker = Array<[Piece, PieceSprite]>

const getPiece = (linker: PieceAndPieceSpriteLinker, sprite: PieceSprite): Piece | null => {
  const link = linker.find(([_, s]) => isSameInstance(s, sprite))
  return link === undefined ? null : link[0]
}

const getSprite = (linker: PieceAndPieceSpriteLinker, piece: Piece): Sprite | null => {
  const link = linker.find(([p, _]) => isSameInstance(p, piece))
  return link === undefined ? null : link[1]
}

/**
 * 将棋対戦画面
 */
export class MainScene extends Phaser.Scene {
  private readonly shogi: Shogi
  private boardContainer: Container
  private background: Sprite
  private linker: PieceAndPieceSpriteLinker = []
  private g: Shogiverse

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
    this.g = this.game as Shogiverse
    this.background = this.add.sprite(WIDTH / 2, HEIGHT / 2, "board").setDisplaySize(HEIGHT, HEIGHT)
    this.boardContainer = this.add.container(WIDTH / 2 - CELL_SIZE * 4, HEIGHT / 2 - CELL_SIZE * 4)
    this.shogi.board.matForEach((piece, pos) => {
      if (piece !== null) {
        const sprite = new PieceSprite(
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
        this.boardContainer.add(sprite)
        sprite.setInteractive()
        this.input.setDraggable(sprite)
        this.linker.push([piece, sprite])
      }
    })

    this.input.on("dragstart", (pointer: Phaser.Input.Pointer, gameObject: Sprite) => {
      if (gameObject instanceof PieceSprite) {
        gameObject.depth = 1
      }
    })

    this.input.on("drag", (pointer: Phaser.Input.Pointer, gameObject: Sprite, dragX: number, dragY: number) => {
      if (gameObject instanceof PieceSprite) {
        gameObject.x = dragX
        gameObject.y = dragY
      }
    })

    this.input.on("dragend", (pointer: Phaser.Input.Pointer, gameObject: Sprite) => {
      if (gameObject instanceof PieceSprite) {
        gameObject.depth = 0

        const to: Point = {
          x: Math.round(gameObject.x / CELL_SIZE),
          y: Math.round(gameObject.y / CELL_SIZE)
        }
        const gameObjectPiece = getPiece(this.linker, gameObject) as Piece
        const existsPieceInBoard = this.shogi.getPosition(gameObjectPiece) !== null
        const existsPieceInHand = this.shogi.hand[this.shogi.turnPlayer].some(p => isSameInstance(p, gameObjectPiece))
        const takedPiece = this.shogi.board.at(to)

        if (existsPieceInBoard) {
          // move
          const piecePos = this.shogi.getPosition(gameObjectPiece) as Point
          const res = this.shogi.move(piecePos, to)
          if (res.type === "move_error") {
            console.log("Move error: ", res)
            gameObject.resetByBoardPosition()
            return
          }

          this.g.room.send({
            type: "move",
            from: piecePos,
            to,
            isPromotion: false
          })

        } else if (existsPieceInHand) {
          // put
          const handIndex = this.shogi.hand[this.shogi.turnPlayer].findIndex(p => isSameInstance(p, gameObjectPiece))
          const res = this.shogi.placeHandPiece(gameObjectPiece, to)
          if (res.type === "put_error") {
            console.log("Place error: ", res)
            gameObject.resetByBoardPosition()
            return
          }

          this.g.room.send({
            type: "place",
            pos: to,
            handIndex
          })

        } else {
          throw new ShogiError("動かしている駒が持ち駒でも置いてある駒でもありません")
        }

        // とった駒があれば持ち駒置き場に移動する
        if (takedPiece !== null) {
          const handIndex = this.shogi.hand[gameObjectPiece.owner].length - 1 // この時点で既にshogi内の持ち駒は増えているので-1
          const takedPieceSprite = getSprite(this.linker, takedPiece) as PieceSprite
          console.log(this.linker, takedPiece)
          takedPieceSprite.moveToHand(handIndex, gameObjectPiece.owner)
        }

        // 駒を移動
        gameObject.setNewBoardPosition({x: to.x * CELL_SIZE, y: to.y * CELL_SIZE})
      }
    })

    this.g.server.joinOrCreate("battle").then(room => {
      this.g.room = room
      console.log(room.sessionId, "joined", room.name)

      // tslint:disable-next-line: no-unsafe-any
      room.state.players.onAdd = (player: Scheme.Player, key: integer) => {
        if (player.id === room.sessionId) {
          if (player.color === Player.White) {
            // 白番なら将棋盤をひっくり返す
            console.log("rotate")
            this.boardContainer.setPosition(WIDTH / 2 + CELL_SIZE * 4, HEIGHT / 2 + CELL_SIZE * 4)
            this.boardContainer.angle = 180
          }
        }
      }

      room.onMessage((msg: Message) => {
        switch (msg.type) {
          case "move": {
            const {from, to, isPromotion} = msg
            const movedPiece = this.shogi.board.at(from) as Piece
            const takedPiece = this.shogi.board.at(to)

            // move
            const res = this.shogi.move(from, to)
            if (res.type === "move_error") {
              console.log("Move error: ", res)
              throw new ShogiError("サーバーから無効な駒の移動操作が送られてきました")
            }

            // 取られた駒があれば相手の持ち駒置き場に移動する
            if (takedPiece !== null) {
              // この時点で既にshogi内の持ち駒は増えているので-1
              const handIndex = this.shogi.hand[movedPiece.owner].length - 1
              const takedPieceSprite = getSprite(this.linker, takedPiece) as PieceSprite
              console.log(this.linker, takedPiece)
              takedPieceSprite.moveToHand(handIndex, movedPiece.owner)
            }

            // 駒を移動
            const movedPieceSprite = getSprite(this.linker, movedPiece) as PieceSprite
            movedPieceSprite.setNewBoardPosition({x: to.x * CELL_SIZE, y: to.y * CELL_SIZE})

            return
          }
          case "place": {
            const {pos, handIndex} = msg
            const placedPiece = this.shogi.hand[this.shogi.turnPlayer][handIndex]

            console.log(msg, this.shogi.turnPlayer, placedPiece, this.shogi.hand)

            // put
            const res = this.shogi.placeHandPiece(placedPiece, pos)
            if (res.type === "put_error") {
              console.log("Place error: ", res)
              throw new ShogiError("サーバーから無効な駒の移動操作が送られてきました")
            }

            // 駒を移動
            const placedPieceSprite = getSprite(this.linker, placedPiece) as PieceSprite
            placedPieceSprite.setNewBoardPosition({x: pos.x * CELL_SIZE, y: pos.y * CELL_SIZE})

            return
          }
        }
      })
    }).catch(e => {
        console.log("Room join error", e)
        throw new ShogiError("Room join error")
    })
  }

  // tslint:disable-next-line
  public update(): void {}
}
