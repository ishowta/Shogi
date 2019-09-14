import { CELL_SIZE, HEIGHT, PIECE_SIZE, WIDTH } from "../constant"
import { Board } from "../../library/shogi/board"
import { ShogiError } from "../../library/shogi/errors"
import { Piece, PieceType } from "../../library/shogi/piece"
import { Player } from "../../library/shogi/player"
import { Shogi } from "../../library/shogi/shogi"
import { isSameInstance, Point } from "../../library/shogi/util"
import { Shogiverse } from "../game"
import { Message, MoveMessage } from "../../messageTypes"
import * as Scheme from "../../schemes"
import { Scene } from "phaser"

type Sprite = Phaser.GameObjects.Sprite
type Container = Phaser.GameObjects.Container

class PieceSprite extends Phaser.GameObjects.Sprite {
	public constructor(scene: Scene, piece: Piece, x: integer, y: integer) {
		super(
			scene,
			x,
			y,
			piece.type
				+ (piece.isPromote ? "+" : "")
				+ (piece.type === PieceType.King && piece.owner === Player.White ? "*" : "")
		)
		this.displayHeight = PIECE_SIZE
		this.displayWidth = PIECE_SIZE * (this.width / this.height)
		if (piece.owner === Player.White) {
			this.turnPiece()
		}
	}

	public setPos(pos: Point): void {
		this.setPosition(pos.x, pos.y)
	}

	public turnPiece(): void {
		this.angle += 180
	}
}

/** ライブラリのpieceとゲームのpieceSpriteを相互参照する用のリンク */
type PieceAndPieceSpriteLinker = Array<[Piece, PieceSprite]>

/**
 * 将棋対戦画面
 */
export class MainScene extends Phaser.Scene {
	private readonly shogi: Shogi
	private boardContainer: Container
	private background: Sprite
	private linker: PieceAndPieceSpriteLinker = []
	private g: Shogiverse
	private dragStartPosition: Point | null
	private player: Player

	public constructor() {
		super({ key: "MainScene" })
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

	private static getHandPosition(player: Player, handIndex: integer): Point {
		switch (player) {
			case Player.Black:
				return { x: CELL_SIZE * (8 + handIndex + 2), y: CELL_SIZE * 8 }
			case Player.White:
				return { x: CELL_SIZE * (0 - handIndex - 2), y: 0 }
		}
	}

	private getPiece(sprite: PieceSprite): Piece | null {
		const link = this.linker.find(([_, s]) => isSameInstance(s, sprite))
		return link === undefined ? null : link[0]
	}

	private getSprite(piece: Piece): Sprite | null {
		const link = this.linker.find(([p, _]) => isSameInstance(p, piece))
		return link === undefined ? null : link[1]
	}

	/** 駒の所有者がチェンジした時に呼ぶ */
	private changePieceOwner(piece: PieceSprite, isPlayer: boolean): void {
		piece.angle += 180
		this.input.setDraggable(piece, isPlayer)
	}

	/** 将棋盤に駒を並べる */
	private initBoard(): void {
		this.shogi.board.matForEach((piece, pos) => {
			if (piece !== null) {
				const pieceSprite = new PieceSprite(this, piece, pos.x * CELL_SIZE, pos.y * CELL_SIZE)
				this.boardContainer.add(pieceSprite)
				pieceSprite.setInteractive()
				this.linker.push([piece, pieceSprite])
			}
		})
	}

	/** プレイヤーが黒番か白番か確定した時に呼んで、ゲームの開始処理を行う */
	private initGame(): void {
		this.shogi.board.matForEach(piece => {
			if (piece !== null && piece.owner === this.player) {
				this.input.setDraggable(this.getSprite(piece) as PieceSprite)
			}
		})
	}

	private movePiece(boardPieceSprite: PieceSprite, to: Point, doPromote: boolean, fromServer: boolean): void {
		const movedPiece = this.getPiece(boardPieceSprite) as Piece
		const takedPiece = this.shogi.board.at(to)
		const from = this.shogi.getPosition(movedPiece) as Point

		// 動かす
		const res = this.shogi.move(from, to, doPromote)

		if (res.type !== "ok") {
			console.log("Move error", res)
			// 動かせなかったら元に戻す
			if (!fromServer) {
				boardPieceSprite.setPos(this.dragStartPosition as Point)
			}
			return
		}

		// 自分で動かしたなら相手に操作を伝える
		if (!fromServer) {
			this.g.room.send({
				type: "move",
				from,
				to,
				doPromote
			})
		}

		// 駒を取っていれば所有者を変えて取ったプレイヤーの持ち駒置き場に移動させる
		if (takedPiece !== null) {
			const handIndex = this.shogi.hand[movedPiece.owner].length - 1 // (この時点で既にshogi内の持ち駒は増えているので-1している)
			const takedPieceSprite = this.getSprite(takedPiece) as PieceSprite
			this.changePieceOwner(takedPieceSprite, movedPiece.owner === this.player)
			takedPieceSprite.setPos(MainScene.getHandPosition(movedPiece.owner, handIndex))
		}

		// ゲームの駒を動かす
		const movedPieceSprite = this.getSprite(movedPiece) as PieceSprite
		movedPieceSprite.setPosition(to.x * CELL_SIZE, to.y * CELL_SIZE)
	}

	private placePiece(handPieceSprite: PieceSprite, to: Point, fromServer: boolean): void {
		const placedPiece = this.getPiece(handPieceSprite) as Piece
		const handIndex = this.shogi.hand[placedPiece.owner].findIndex(piece => isSameInstance(piece, placedPiece))

		// 置く
		const res = this.shogi.placeHandPiece(placedPiece, to)

		if (res.type !== "ok") {
			console.log("Place error", res)
			// 動かせなかったら元に戻す
			if (!fromServer) {
				handPieceSprite.setPos(this.dragStartPosition as Point)
			}
			return
		}

		// 自分で動かしたなら相手に操作を伝える
		if (!fromServer) {
			this.g.room.send({
				type: "place",
				pos: to,
				handIndex
			})
		}

		// ゲームの駒を置く
		const placedPieceSprite = this.getSprite(placedPiece) as PieceSprite
		placedPieceSprite.setPosition(to.x * CELL_SIZE, to.y * CELL_SIZE)
	}

	public create(): void {
		this.g = this.game as Shogiverse
		this.background = this.add.sprite(WIDTH / 2, HEIGHT / 2, "board").setDisplaySize(HEIGHT, HEIGHT)
		this.boardContainer = this.add.container(WIDTH / 2 - CELL_SIZE * 4, HEIGHT / 2 - CELL_SIZE * 4)
		this.initBoard()

		this.input.on("dragstart", (pointer: Phaser.Input.Pointer, gameObject: Sprite) => {
			this.dragStartPosition = { x: gameObject.x, y: gameObject.y }
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

				const to: Point = { x: Math.round(gameObject.x / CELL_SIZE), y: Math.round(gameObject.y / CELL_SIZE) }
				const gameObjectPiece = this.getPiece(gameObject) as Piece
				const existsPieceInBoard = this.shogi.getPosition(gameObjectPiece) !== null
				const existsPieceInHand = this.shogi.hand[this.shogi.turnPlayer].some(p =>
					isSameInstance(p, gameObjectPiece)
				)

				if (existsPieceInBoard) {
					this.movePiece(gameObject, to, false, false)
				} else if (existsPieceInHand) {
					this.placePiece(gameObject, to, false)
				} else {
					throw new ShogiError("動かしている駒が持ち駒でも置いてある駒でもありません")
				}
			}
		})

		this.g.server
			.joinOrCreate("battle")
			.then(room => {
				this.g.room = room
				console.log(`Joined a room. Player ID : ${room.sessionId}, Room name : ${room.name}`)

				// tslint:disable-next-line: no-unsafe-any
				room.state.players.onAdd = (player: Scheme.Player, key: integer) => {
					if (player.id === room.sessionId) {
						console.log(`Player color: ${player.color}`)
						this.player = player.color as Player
						if (player.color === Player.White) {
							// 白番なら将棋盤をひっくり返す
							this.boardContainer.setPosition(WIDTH / 2 + CELL_SIZE * 4, HEIGHT / 2 + CELL_SIZE * 4)
							this.boardContainer.angle = 180
						}

						this.initGame()
					}
				}

				room.onMessage((msg: Message) => {
					switch (msg.type) {
						case "move": {
							const { from, to, doPromote } = msg
							const movedPieceSprite = this.getSprite(this.shogi.board.at(from) as Piece) as PieceSprite
							this.movePiece(movedPieceSprite, to, doPromote, true)
							return
						}
						case "place": {
							const { pos, handIndex } = msg
							const placedPieceSprite = this.getSprite(
								this.shogi.hand[this.shogi.turnPlayer][handIndex]
							) as PieceSprite
							this.placePiece(placedPieceSprite, pos, true)
							return
						}
					}
				})
			})
			.catch(e => {
				console.log("Room join error", e)
				throw new ShogiError("Room join error")
			})

		this.add
			.text(50, 100, "Flip", { fill: "#0f0" })
			.setInteractive()
			.on("pointerdown", () => {
				this.boardContainer.setPosition(WIDTH / 2 - CELL_SIZE * 4, HEIGHT / 2 - CELL_SIZE * 4)
				this.boardContainer.angle += 180
			})
		this.add
			.text(50, 200, "Allow move all", { fill: "#0f0" })
			.setInteractive()
			.on("pointerdown", () => {
				this.linker.forEach(([_, sprite]) => this.input.setDraggable(sprite))
			})
	}

	// tslint:disable-next-line
  public update(): void {}
}
