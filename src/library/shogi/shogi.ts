import { BitBoard, Board, PieceBoard } from "./board"
// tslint:disable-next-line:max-line-length
import {
	BoundError,
	CantMoveError,
	CantPromoteError,
	DoublePawnFoul,
	DuplicateError,
	FoulError,
	MoveError,
	NeglectKingFoul,
	NoPieceError,
	NotOwnedPieceError,
	ShogiError,
	StrikingFoul,
	ThousandDaysFoul
} from "./errors"
import { Piece, PieceType, Dir } from "./piece"
import { Player } from "./player"
import { deepCopy, isSameInstance, Point, add, equal } from "./util"

/** OK */
export type Ok = {
	/** type */
	readonly type: "ok"
}

/** チェックメイト */
export type Checkmate = {
	/** type */
	readonly type: "checkmate"
}

/** 駒を動かせない */
export type MoveNotAllowedError = {
	/** 駒を動かせない理由 */
	readonly reason: NoPieceError | NotOwnedPieceError | CantMoveError | CantPromoteError | NeglectKingFoul
	/** type */
	readonly type: "move_error"
}

/** 置けるが負け判定になる反則 */
export type Foul = {
	/** 駒を動かせない理由 */
	readonly reason: ThousandDaysFoul
	/** type */
	readonly type: "foul"
}

/** 駒を置けない */
export type PlacementNotAllowedError = {
	/** 駒を置けない理由 */
	readonly reason:
		| BoundError
		| NotOwnedPieceError
		| DuplicateError
		| CantMoveError
		| StrikingFoul
		| DoublePawnFoul
		| NeglectKingFoul
	/** type */
	readonly type: "put_error"
}

/** 指し手のログ */
export type MoveLog = {
	/** 移動する前の駒の位置 */
	readonly from: Point | null
	/**
	 * そのときの状態を示す識別子
	 *
	 * 履歴（どう指してきたかは無視する）
	 */
	readonly id: string
	/** 既に成っているか */
	readonly isPromoted: boolean
	/** 成ったか */
	readonly isPromotion: boolean
	/** 駒の種類 */
	readonly pieceType: PieceType
	/** 指したプレイヤー */
	readonly player: Player
	/** 駒が置かれた位置 */
	readonly position: Point
}

/** 棋譜 */
export type Score = MoveLog[]

/** 持ち駒 */
export type Hand = { [P in Player]: Piece[] }

/** 将棋を管理するフレームワーク */
export class Shogi {
	/// Properties

	/** 将棋盤 */
	public board: PieceBoard

	/** 各プレイヤーの持ち駒 */
	public hand: Hand

	/** 棋譜 */
	public score: Score

	/** 現在のターンプレイヤー */
	public turnPlayer: Player

	/// Constructor

	public constructor() {
		this.board = PieceBoard.make()
		this.hand = { black: [], white: [] }
		this.turnPlayer = Player.Black
		this.score = []
	}

	/// Shogi operators

	/** プレイヤーを交代する */
	private changePlayer(): Ok | Foul | Checkmate {
		this.turnPlayer = this.turnPlayer === Player.Black ? Player.White : Player.Black
		const checkFoulRes: Ok | Foul = this.checkFoul()
		if (checkFoulRes.type === "foul") {
			return checkFoulRes
		}
		if (this.checkCheckMate()) {
			return { type: "checkmate" }
		}
		return { type: "ok" }
	}

	/** 駒を進める */
	public move(
		from: Point,
		to: Point,
		doPromote: boolean = false,
		skipFoul: boolean = false
	): Ok | MoveNotAllowedError | Foul | Checkmate {
		const canMove: Ok | MoveNotAllowedError = this.checkCanMove(from, to, doPromote, skipFoul)
		if (canMove.type === "move_error") {
			return canMove
		}
		const takenPiece: Piece | null = this.board.at(to)
		const movedPiece: Piece = this.board.at(from) as Piece

		// 成りたいのであれば成る
		if (doPromote) {
			movedPiece.isPromote = true
		}

		// 駒を取れたら持ち駒に加える
		if (takenPiece !== null) {
			const newHandPiece: Piece = takenPiece
			newHandPiece.owner = this.turnPlayer
			newHandPiece.isPromote = false
			this.hand[this.turnPlayer].push(newHandPiece)
		}

		// 移動
		this.board.assign(to, movedPiece)
		this.board.assign(from, null)

		// 棋譜に書き込む
		this.score.push({
			player: this.turnPlayer,
			position: to,
			pieceType: movedPiece.type,
			isPromotion: doPromote,
			from,
			isPromoted: movedPiece.isPromote || doPromote,
			id: this.toString()
		})

		// 交代
		return this.changePlayer()
	}

	/** 持ち駒を置く */
	public placeHandPiece(
		piece: Piece,
		pos: Point,
		skipFoul: boolean = false
	): Ok | PlacementNotAllowedError | Foul | Checkmate {
		const canPut: Ok | PlacementNotAllowedError = this.checkCanPlaceHandPiece(piece, pos, skipFoul)
		if (canPut.type === "put_error") {
			return canPut
		}
		// 置く
		this.board.assign(pos, piece)

		// 持ち駒から取り除く
		this.hand[this.turnPlayer] = this.hand[this.turnPlayer].filter(p => !isSameInstance(p, piece))

		// 棋譜に書き込む
		this.score.push({
			player: this.turnPlayer,
			position: pos,
			pieceType: piece.type,
			isPromotion: false,
			from: null,
			isPromoted: false,
			id: this.toString()
		})

		// 交代
		return this.changePlayer()
	}

	/// Public utils

	/**
	 * 駒が動けるエリアを示すbitboardを返す
	 * @param piece 動かす駒
	 * @param _pos 駒の現在地
	 */
	private static isRestrictionPieceConstraits(piece: Piece, _pos: Point): BitBoard {
		const board: BitBoard = BitBoard.init()

		const _isRestrictionPieceConstraits = (pos: Point) => {
			const dirList: Dir[] = piece.isPromote
				? Piece.MovableDir[piece.type].promoted
				: Piece.MovableDir[piece.type].normal
			for (const dir of dirList) {
				let currentPos: Point = pos
				let count: integer = 0
				while (count < dir.times) {
					currentPos = add(currentPos, dir.dif)
					if (!Board.inBound(currentPos)) {
						break
					}
					board.assign(currentPos, true)
					count += 1
				}
			}
		}

		const reversePosition = (pos: Point): Point => ({ x: Board.width - 1 - pos.x, y: Board.height - 1 - pos.y })

		switch (piece.owner) {
			case Player.Black:
				_isRestrictionPieceConstraits(_pos)
				return board
			case Player.White:
				board.applyWithReverse(() => _isRestrictionPieceConstraits(reversePosition(_pos)))
				return board
		}
	}

	/** 駒を動かせるかチェックする */
	public checkCanMove(
		from: Point,
		to: Point,
		doPromote: boolean = false,
		skipFoul: boolean = false,
		allowNeglectKing: boolean = false
	): Ok | MoveNotAllowedError {
		// 将棋盤からはみ出ている
		if (!Board.inBound(from) || !Board.inBound(to)) {
			return { type: "move_error", reason: new NoPieceError() }
		}

		const takenPiece: Piece | null = this.board.at(to)
		const movedPiece: Piece | null = this.board.at(from)

		/// Fromの位置に動かせる駒があるか

		// そこに駒が置かれていない
		if (movedPiece === null) {
			return { type: "move_error", reason: new NoPieceError() }
		}
		// 相手の駒を動かそうとしている
		if (movedPiece.owner !== this.turnPlayer) {
			return { type: "move_error", reason: new NotOwnedPieceError() }
		}

		/// 駒を動かせるか

		// 駒の制約的に動かせない場所に動かそうとしている
		if (
			!(Shogi.isRestrictionPieceConstraits(movedPiece, this.getPosition(movedPiece) as Point).at(to) as boolean)
		) {
			return { type: "move_error", reason: new CantMoveError() }
		}
		// 動かそうとすると他の駒とぶつかる
		if (this.isCollideWithOtherPieces(movedPiece, from, to)) {
			return { type: "move_error", reason: new CantMoveError() }
		}
		// 置かれる場所に自分の駒がある
		if (takenPiece !== null && takenPiece.owner === this.turnPlayer) {
			return { type: "move_error", reason: new CantMoveError() }
		}

		/// 成れるか

		// 既に成っているのに成ろうとしている
		if (movedPiece.isPromote && doPromote) {
			return { type: "move_error", reason: new CantPromoteError() }
		}
		// 成ることのできない駒なのに成ろうとしている
		if (doPromote && !Piece.canPromote(movedPiece.type)) {
			return { type: "move_error", reason: new CantPromoteError() }
		}

		if (!skipFoul) {
			/// 反則

			const nextShogi: Shogi = (() => {
				const newShogi: Shogi = deepCopy(this)
				const newPiece: Piece = newShogi.board.at(from) as Piece
				newShogi.move(from, to, doPromote, true)
				return newShogi
			})()

			if (!allowNeglectKing) {
				// 王手放置
				if (Shogi.checkNeglectKing(nextShogi, this.turnPlayer === Player.Black ? Player.White : Player.Black)) {
					return { type: "move_error", reason: new NeglectKingFoul() }
				}
			}
		}

		/// OK

		return { type: "ok" }
	}

	/** 持ち駒をそこに置けるかチェック */
	public checkCanPlaceHandPiece(piece: Piece, pos: Point, skipFoul: boolean = false): Ok | PlacementNotAllowedError {
		// 将棋盤からはみ出ている
		if (!Board.inBound(pos)) {
			return { type: "put_error", reason: new BoundError() }
		}

		// 持ち駒ではない
		if (!this.hand[this.turnPlayer].includes(piece)) {
			return { type: "put_error", reason: new NoPieceError() }
		}

		// 相手の持ち駒を動かそうとしている
		if (piece.owner !== this.turnPlayer) {
			return { type: "put_error", reason: new NotOwnedPieceError() }
		}

		// 他の駒がある場所には置けない
		if (this.board.at(pos) !== null) {
			return { type: "put_error", reason: new DuplicateError() }
		}

		// 動けない位置に持ち駒を置いてはいけない
		if (!Shogi.isRestrictionPieceConstraits(piece, pos).exist()) {
			return { type: "put_error", reason: new CantMoveError() }
		}

		if (!skipFoul) {
			const nextShogi: Shogi = (() => {
				const newShogi: Shogi = deepCopy(this)
				const pieceHandPos: number = this.hand[this.turnPlayer].indexOf(piece)
				const newPiece: Piece = newShogi.hand[this.turnPlayer][pieceHandPos]
				newShogi.placeHandPiece(newPiece, pos, true)
				return newShogi
			})()

			// 打ち歩詰め
			const checkStrike = (): boolean => {
				if (piece.type === PieceType.Pawn && pos.y !== 0) {
					const frontPiece: Piece | null = this.board.at({ x: pos.x, y: pos.y - 1 })
					return (
						frontPiece !== null
						&& frontPiece.type === PieceType.King
						&& frontPiece.owner !== this.turnPlayer
					)
				}
				return false
			}
			if (checkStrike()) {
				return { type: "put_error", reason: new StrikingFoul() }
			}

			// ２歩
			if (
				nextShogi.board.filter(line => {
					const p: Piece | null = line[pos.x]
					return p !== null && p.owner === piece.owner && p.type === PieceType.Pawn
				}).length === 2
			) {
				return { type: "put_error", reason: new DoublePawnFoul() }
			}

			// 王手放置
			if (Shogi.checkNeglectKing(nextShogi, this.turnPlayer === Player.Black ? Player.White : Player.Black)) {
				return { type: "put_error", reason: new NeglectKingFoul() }
			}
		}

		// Ok
		return { type: "ok" }
	}

	/** 詰みチェック */
	public checkCheckMate(): boolean {
		const challenger: Player = this.turnPlayer
		const opponent: Player = this.turnPlayer === Player.Black ? Player.White : Player.Black

		/// `checkNeglectKing()`をfalseに出来る打ち手がなければ詰み

		// 可能な駒の移動をすべて試す
		const challengerPieceList: Piece[] = this.board.matFilter(
			piece => piece !== null && piece.owner === challenger
		) as Piece[]
		const canAvoidCheckMateByMove: boolean = challengerPieceList.some(piece => {
			const piecePos: Point = this.getPosition(piece) as Point
			return Board.posMatrix().matSome(pos => {
				if (this.checkCanMove(piecePos, pos, false, false, true).type === "ok") {
					const shogi: Shogi = deepCopy(this)
					shogi.move(piecePos, pos, false)
					return !Shogi.checkNeglectKing(shogi, opponent)
				}
				return false
			})
		})

		// 可能な持ち駒の設置をすべて試す
		const challengerHandPieceList: Piece[] = this.hand[challenger]
		const canAvoidCheckMateByPut: boolean = challengerHandPieceList.some(piece => {
			const pieceHandPos: number = this.hand[challenger].indexOf(piece)
			Board.posMatrix().matSome(pos => {
				if (this.checkCanPlaceHandPiece(piece, pos).type === "ok") {
					const shogi: Shogi = deepCopy(this)
					const newPiece: Piece = shogi.hand[challenger][pieceHandPos]
					shogi.placeHandPiece(newPiece, pos)
					return !Shogi.checkNeglectKing(shogi, opponent)
				}
				return false
			})
		})

		return canAvoidCheckMateByMove || canAvoidCheckMateByPut
	}

	/** 反則チェック */
	public checkFoul(): Ok | Foul {
		// 千日手
		if (this.checkThousandDays()) {
			return { type: "foul", reason: new ThousandDaysFoul() }
		}

		return { type: "ok" }
	}

	/** 王手放置チェック */
	public checkNeglectKing(): boolean {
		return Shogi.checkNeglectKing(this, this.turnPlayer)
	}

	/** 王手放置チェック */
	public static checkNeglectKing(nextShogi: Shogi, nextTurnPlayer: Player): boolean {
		const currentTurnPlayer: Player = Shogi.reverse(nextTurnPlayer)
		const kingPosition: Point | null = nextShogi.board.matFindIndex(
			p => p !== null && p.owner === currentTurnPlayer && p.type === PieceType.King
		)

		if (kingPosition === null) {
			throw new ShogiError("王将がいません")
		}

		// 相手の駒に王将に届く駒があるか判定
		return nextShogi.board.matSome(
			(piece, pos) =>
				piece !== null
				&& piece.owner === nextTurnPlayer
				&& nextShogi.checkCanMove(pos, kingPosition, false, false, true).type === "ok"
		)
	}

	/** 千日手チェック */
	public checkThousandDays(): boolean {
		if (this.score.length < 4) {
			return false
		}
		const currentId: string = this.score[this.score.length - 1].id
		// 最後の手と同じ手がいくつあるか（最後の手も数える）
		const duplicateWithCurrentIdCount: integer = this.score
			.slice(0, this.score.length)
			.filter(score => score.id === currentId).length
		return duplicateWithCurrentIdCount >= 4
	}

	/** 持ち駒のpieceが置ける座標を示すbitboardを返す */
	public findPlaceableArea(piece: Piece): BitBoard | ShogiError {
		// 持ち駒ではない
		if (!this.hand[this.turnPlayer].includes(piece)) {
			return new ShogiError("持ち駒ではない")
		}

		return BitBoard.init(
			this.board.matMap((_, pos) => this.checkCanPlaceHandPiece(piece, pos, false).type === "ok")
		)
	}

	/** pieceが移動できる座標を示すbitboardを返す */
	public findMovableArea(piece: Piece, skipFoul: boolean = false): BitBoard | ShogiError {
		// 盤面にある自分の駒ではない
		if (this.getPosition(piece) === null || piece.owner !== this.turnPlayer) {
			return new ShogiError("盤面にある自分の駒ではない")
		}

		const piecePos: Point = this.getPosition(piece) as Point
		return BitBoard.init(
			this.board.matMap((_, pos) => this.checkCanMove(piecePos, pos, false, skipFoul).type === "ok")
		)
	}

	/** 動かす時他の駒にぶつかるか */
	public isCollideWithOtherPieces(piece: Piece, _from: Point, _to: Point): boolean {
		const board: BitBoard = BitBoard.init()

		const _isCollideWithOtherPieces = (from: Point, to: Point): boolean => {
			const dirList: Dir[] = piece.isPromote
				? Piece.MovableDir[piece.type].promoted
				: Piece.MovableDir[piece.type].normal
			// ∃dir ∈ Dir, ∃n ∈ N, from + n * dir.d = to
			const usedDir: Dir = dirList.find(dir => {
				const isNatural = (x: number) => Number.isInteger(x) && Math.sign(x) === 1
				const nx: number = (to.x - from.x) / dir.dif.x
				const ny: number = (to.y - from.y) / dir.dif.y
				return (
					(nx === ny && isNatural(nx))
					|| (Number.isNaN(nx) && isNatural(ny))
					|| (Number.isNaN(ny) && isNatural(nx))
				)
			}) as Dir
			let currentPos: Point = from
			let count: integer = 1
			while (count < usedDir.times) {
				currentPos = add(currentPos, usedDir.dif)
				if (equal(currentPos, to)) {
					return false
				}
				if (this.board.at(currentPos) !== null) {
					return true
				}
				count += 1
			}
			return false
		}

		const reversePosition = (pos: Point): Point => ({ x: Board.width - 1 - pos.x, y: Board.height - 1 - pos.y })

		switch (piece.owner) {
			case Player.Black:
				return _isCollideWithOtherPieces(_from, _to)
			case Player.White:
				return board.applyWithReverse(() =>
					_isCollideWithOtherPieces(reversePosition(_from), reversePosition(_to))
				)
		}
	}

	/** 駒pieceの将棋盤における位置を得る */
	public getPosition(piece: Piece): Point | null {
		return this.board.matFindIndex(p => isSameInstance(p, piece))
	}

	/** 将棋の正しい座標 -> フレームワーク内の座標 */
	public static c(x: integer, y: integer): Point {
		return { x: Board.width - x, y: y - 1 }
	}

	/** 将棋盤をログに表示 */
	public printBoard(): void {
		const WrapWithOwnerMark = (owner: Player, text: string): string =>
			(owner === Player.Black ? " " : "(") + text + (owner === Player.Black ? " " : ")")

		this.board.forEach(line => {
			console.log(
				line.reduce<string>(
					(log, piece) =>
						String(log) + (piece === null ? " 　 " : WrapWithOwnerMark(piece.owner, piece.toString())),
					""
				)
			)
		})
	}

	/** 文字列に変換する（履歴は無視される） */
	public toString(): string {
		const toString = (player: Player) => (player === Player.Black ? "0" : "1")
		const pieceTypeToNumber = (type: PieceType): integer => Object.values(PieceType).findIndex(t => t === type)
		let data: string = ""
		data += `${toString(this.turnPlayer)},`
		data += `${this.hand[Player.Black]
			.map(p => pieceTypeToNumber(p.type))
			.sort()
			.join("")},`
		data += `${this.hand[Player.White]
			.map(p => pieceTypeToNumber(p.type))
			.sort()
			.join("")},`
		data += (() => {
			let res: string = ""
			for (const [y, line] of this.board.entries()) {
				for (const [x, piece] of line.entries()) {
					if (piece !== null) {
						res += pieceTypeToNumber(piece.type)
						res += toString(piece.owner)
						res += piece.isPromote ? "1" : "0"
					} else {
						res += "_"
					}
					if (x !== Board.width - 1) {
						res += "-"
					}
				}
				if (y !== Board.height - 1) {
					res += ","
				}
			}

			return res
		})()

		return data
	}

	/** 文字列から将棋盤を生成する（履歴は無視される） */
	public fromString(data: string): Shogi {
		return Shogi.fromString(this, data)
	}

	/** 文字列から将棋盤を生成する（履歴は無視される） */
	public static fromString(shogi: Shogi, data: string): Shogi {
		const fromString = (player: string) => (player === "0" ? Player.Black : Player.White)
		const pieceFromNumber = (num: integer): PieceType => Object.values(PieceType)[num]
		const splitedData: string[] = data.split(",")
		shogi.turnPlayer = fromString(splitedData[0])
		shogi.hand[Player.Black] = [...splitedData[1]].map(
			type => new Piece(pieceFromNumber(parseInt(type, 10)), Player.Black)
		)
		shogi.hand[Player.White] = [...splitedData[2]].map(
			type => new Piece(pieceFromNumber(parseInt(type, 10)), Player.White)
		)
		shogi.board = PieceBoard.init(
			splitedData.slice(3, Board.height + 3).map(line =>
				line.split("-").map(d => {
					if (d === "_") {
						return null
					}
					const p: Piece = new Piece(pieceFromNumber(parseInt(d[0], 10)), fromString(d[1]))
					p.isPromote = d[2] === "1" ? true : false

					return p
				})
			)
		)

		return shogi
	}

	/** 向かいのプレイヤーを返す */
	public static reverse(player: Player): Player {
		return player === Player.Black ? Player.White : Player.Black
	}
}
