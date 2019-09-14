import { Piece, PieceType } from "./piece"
import { Player } from "./player"
import { deepCopy, Point, range, irange } from "./util"

/** 将棋盤 */
export class Board<T> extends Array<T[]> {
	/** 高さ（上下の長さ） */
	public static readonly height: integer = 9

	/** 幅（左右の長さ） */
	public static readonly width: integer = 9

	/** 2次元配列で初期化 */
	protected resetByArray(arr: T[][]): void {
		this.length = 0
		for (const y of range(0, Board.height - 1)) {
			this.push(new Array<T>())
			const line: T[] = this[this.length - 1]
			for (const x of range(0, Board.width - 1)) {
				line.push(arr[y][x])
			}
		}
	}

	/** defaultValueで盤面を初期化 */
	protected resetByValue(defaultValue: T): void {
		for (const y of range(0, Board.height - 1)) {
			this.push(new Array<T>())
			const line: T[] = this[this.length - 1]
			for (const x of range(0, Board.width - 1)) {
				line.push(defaultValue)
			}
		}
	}

	/** 座標を値として入れた盤面を作成 */
	public static posMatrix(): Board<Point> {
		const posBoard: Board<Point> = new Board<Point>()
		posBoard.resetByArray(range(0, Board.height - 1).map(y => range(0, Board.width - 1).map(x => ({ x, y }))))
		return posBoard
	}

	/**
	 * 位置pの要素を返す
	 * @param p 位置
	 */
	public at(p: Point): T | null {
		if (!Board.inBound(p)) {
			return null
		}
		return this[p.y][p.x]
	}

	/**
	 * 位置pにeを代入する
	 * @param p 代入する位置
	 * @param e 対象
	 */
	public assign(p: Point, e: T): this {
		this[p.y][p.x] = e
		return this
	}

	/**
	 * 位置pが盤面の中を指しているかチェック
	 * @param p 位置
	 */
	public static inBound(p: Point): boolean {
		return !(p.x < 0 || p.x >= Board.width || p.y < 0 || p.y >= Board.height)
	}

	/**
	 * 盤面をひっくり返して関数を実行する
	 * @param fn 逆向きで実行する関数
	 */
	public applyWithReverse<U>(fn: () => U): U {
		this.reverseMatrix()
		const res: U = fn()
		this.reverseMatrix()
		return res
	}

	/** matrix map */
	public matMap<U>(fn: (e: T, index: Point) => U): U[][] {
		return this.map((line, y) => line.map((e, x) => fn(e, { x, y })))
	}

	/** matrix reduce */
	public matReduce<U>(
		fn: (previousValue: U, currentValue: T, currentIndex: Point, array: T[]) => U,
		initialValue: U
	): U {
		return this.reduce((p, c, y) => c.reduce((pp, cc, x, arr) => fn(pp, cc, { x, y }, arr), p), initialValue)
	}

	/** matrix some */
	public matSome(fn: (e: T, index: Point) => boolean): boolean {
		return this.some((line, y) => line.some((e, x) => fn(e, { x, y })))
	}

	/** matrix every */
	public matEvery(fn: (e: T, index: Point) => boolean): boolean {
		return this.every((line, y) => line.every((e, x) => fn(e, { x, y })))
	}

	/** matrix filter */
	public matFilter(fn: (e: T, index: Point) => boolean): T[] {
		return this.flatMap((line, y) => line.filter((e, x) => fn(e, { x, y })))
	}

	/** matrix find */
	public matFind(fn: (e: T, index: Point) => boolean): T | null {
		for (const [y, line] of this.entries()) {
			for (const [x, e] of line.entries()) {
				if (fn(e, { x, y })) {
					return e
				}
			}
		}
		return null
	}

	/** matrix findIndex */
	public matFindIndex(fn: (e: T, index: Point) => boolean): Point | null {
		for (const [y, line] of this.entries()) {
			for (const [x, e] of line.entries()) {
				if (fn(e, { x, y })) {
					return { x, y }
				}
			}
		}
		return null
	}

	/** matrix forEach */
	public matForEach(fn: (e: T, index: Point) => void): void {
		this.forEach((line, y) => line.forEach((e, x) => fn(e, { x, y })))
	}

	/** matrix zip (slow) */
	public zip(rhs: Board<T>): Board<[T, T]> {
		const b: Board<[T, T]> = new Board<[T, T]>()
		b.resetByArray(
			this.matMap((e, pos) => {
				const t: [T, T] = [e, rhs.at(pos) as T]
				return t
			})
		)
		return b
	}

	/** 反転させる */
	private reverseMatrix(): void {
		const bufThis: this = deepCopy(this)
		for (const y of irange(0, Board.height - 1)) {
			for (const x of irange(0, Board.width - 1)) {
				this[Board.height - 1 - y][Board.width - 1 - x] = bufThis[y][x]
			}
		}
	}
}

/** 駒の将棋盤 */
export class PieceBoard extends Board<Piece | null> {
	/** 将棋盤を配列で初期化 */
	public static init(arr: Array<Array<Piece | null>>): PieceBoard {
		const pieceBoard: PieceBoard = new PieceBoard()
		pieceBoard.resetByArray(arr)
		return pieceBoard
	}

	/** 将棋盤を初期化 */
	public static make(): PieceBoard {
		const place = (board: PieceBoard, player: Player): void => {
			board[8][0] = new Piece(PieceType.Lance, player)
			board[8][1] = new Piece(PieceType.Knight, player)
			board[8][2] = new Piece(PieceType.SilverGeneral, player)
			board[8][3] = new Piece(PieceType.GoldGeneral, player)
			board[8][4] = new Piece(PieceType.King, player)
			board[8][5] = new Piece(PieceType.GoldGeneral, player)
			board[8][6] = new Piece(PieceType.SilverGeneral, player)
			board[8][7] = new Piece(PieceType.Knight, player)
			board[8][8] = new Piece(PieceType.Lance, player)
			board[7][1] = new Piece(PieceType.Bishop, player)
			board[7][7] = new Piece(PieceType.Rook, player)
			board[6] = board[6].map(_ => new Piece(PieceType.Pawn, player))
		}

		const pieceBoard: PieceBoard = new PieceBoard()
		pieceBoard.resetByValue(null)

		place(pieceBoard, Player.Black)
		pieceBoard.applyWithReverse(() => place(pieceBoard, Player.White))
		return pieceBoard
	}
}

/** Boolean将棋盤 */
export class BitBoard extends Board<boolean> {
	/** 初期化 */
	public static init(arr?: boolean[][]): BitBoard {
		const pieceBoard: BitBoard = new BitBoard()
		if (arr !== undefined) {
			pieceBoard.resetByArray(arr)
		} else {
			pieceBoard.resetByValue(false)
		}
		return pieceBoard
	}

	/** bit & */
	public and(rhs: BitBoard): BitBoard {
		return BitBoard.init(this.zip(rhs).matMap(([a, b]) => a && b))
	}

	/** rhsでbitboardにマスクを掛ける */
	public mask: (rhs: BitBoard) => BitBoard = this.and

	/** bit | */
	public or(rhs: BitBoard): BitBoard {
		return BitBoard.init(this.zip(rhs).matMap(([a, b]) => a || b))
	}

	/** trueになっている場所が存在するか */
	public exist(): boolean {
		return this.matSome(b => b)
	}
}
