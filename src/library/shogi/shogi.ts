import * as Util from "./util"

/** ２次元座標 */
export interface Point {
    readonly x: integer
    readonly y: integer
}

/**
 * プレイヤーの区別
 *
 * 先行は黒番
 */
export enum Player {
    Black = "black",
    White = "white"
}

/** 将棋ライブラリ内エラー */
export class ShogiError implements Error {
    public name = 'ShogiError';

    constructor(public message: string = "") { }

    toString() {
        return this.name + ': ' + this.message;
    }
}

/** 範囲から出ている */
export class BoundError extends ShogiError { }
/** 重複しているところに置こうとした */
export class DuplicateError extends ShogiError { }
/** 存在しないピースを動かそうとした */
export class NoPieceError extends ShogiError { }
/** 動かせない場所に動かそうとした */
export class CantMoveError extends ShogiError { }
/** 成れないのに成ろうとした */
export class CantPromoteError extends ShogiError { }

/** 反則 */
export class FoulError extends ShogiError { }
/** 千日手 */
export class ThousandDaysFoul extends FoulError { }
/** 王手放置 */
export class NeglectKingError extends FoulError { }
/** 打ち歩詰め */
export class StrikingError extends FoulError { }
/** ２歩 */
export class DoublePawnError extends FoulError { }

/** OK */
export interface Ok {
    type: "ok"
}

/** 駒を動かせない */
export interface MoveError {
    type: "move_error"
    reason: NoPieceError | CantMoveError | CantPromoteError | NeglectKingError
}

/** 駒を置けない */
export interface PutError {
    type: "put_error"
    reason: BoundError | DuplicateError | CantMoveError | StrikingError | DoublePawnError | NeglectKingError
}

/** 反則 */
export interface Foul {
    type: "foul"
    reason: ThousandDaysFoul
}

/** 手 */
export interface MoveLog {
    readonly player: Player,
    readonly position: Point,
    readonly pieceType: PieceType,
    readonly isPromotion: boolean

    // TODO: たどり着ける同じ種類の駒が複数あった場合の表記に対応する

    readonly from: Point | null
    readonly isPromoted: boolean
    readonly id: string
}
/** 棋譜 */
export type Score = MoveLog[]

/** 駒の種類 */
export enum PieceType {
    King,  // 王将
    Rook,  // 飛車
    Bishop,  // 角行
    GoldGeneral,  // 金将
    SilverGeneral,  // 銀将
    Knight,  // 桂馬
    Lance,  // 香車
    Pawn,  // 歩兵
}

/** 駒を管理するクラス */
export class Piece {
    readonly type: PieceType
    owner: Player
    isPromote: boolean

    constructor(type: PieceType, owner: Player) {
        this.type = type
        this.owner = owner
        this.isPromote = false
    }

    /** 進化できる種類の駒か */
    static canPromote(type: PieceType): boolean {
        switch (type) {
            case PieceType.King: return false
            case PieceType.Rook: return true
            case PieceType.Bishop: return true
            case PieceType.GoldGeneral: return false
            case PieceType.SilverGeneral: return true
            case PieceType.Knight: return true
            case PieceType.Lance: return true
            case PieceType.Pawn: return true
        }
    }

    lookY(y: integer) {
        return this.owner == Player.Black ? y : Board.height - 1 - y
    }

    look(p: Point) {
        return this.owner == Player.Black ? p : { x: p.x, y: Board.height - 1 - p.y }
    }
}

/** 将棋盤 */
export class Board<T> extends Array<Array<T>>{
    static readonly width: integer = 9
    static readonly height: integer = 9

    init(arr: T[][]) {
        this.length = 0
        for (const y of Util.range(0, Board.height - 1)) {
            this.push(new Array<T>())
            let line = this[this.length - 1]
            for (const x of Util.range(0, Board.width - 1)) {
                line.push(arr[y][x])
            }
        }
    }

    make(defaultValue: T) {
        for (const y of Util.range(0, Board.height - 1)) {
            this.push(new Array<T>())
            let line = this[this.length - 1]
            for (const x of Util.range(0, Board.width - 1)) {
                line.push(defaultValue)
            }
        }
    }

    at(p: Point): T {
        return this[p.y][p.x]
    }

    assign(p: Point, x: T) {
        this[p.y][p.x] = x
        return this
    }

    inBound(p: Point): boolean {
        return !(p.x < 0 || p.x >= Board.width || p.y < 0 || p.y >= Board.height)
    }

    reverseMatrix() {
        const bufThis = Util.deepCopy(this)
        for (const y of Util.range(0, Board.height - 1)) {
            for (const x of Util.range(0, Board.width - 1)) {
                this[Board.height - 1 - y][Board.width - 1 - x] = bufThis[y][x]
            }
        }
    }

    applyWithReverse<U>(fn: () => U): U {
        this.reverseMatrix()
        const res = fn()
        this.reverseMatrix()
        return res
    }

    flatMap<U>(fn: (line: T[], index: integer) => Array<U>): Array<U> {
        const initialValue: Array<U> = []
        return this.reduce((p, line, i) => p.concat(fn(line, i)), initialValue)
    }

    matMap<U>(fn: (e: T, index: Point) => U): Array<Array<U>> {
        return this.map((line, y) => line.map((e, x) => fn(e, { x: x, y: y })))
    }

    matFilter(fn: (e: T, index: Point) => boolean): Array<Array<T>> {
        return this.filter((line, y) => line.filter((e, x) => fn(e, { x: x, y: y })))
    }

    matReduce<U>(fn: (previousValue: U, currentValue: T, currentIndex: Point, array: T[]) => U, initialValue: U): U {
        return this.reduce((p, c, y) => c.reduce((p, c, x, a) => fn(p, c, { x: x, y: y }, a), p), initialValue)
    }

    matForEach(fn: (e: T, index: Point) => void) {
        this.map((line, y) => line.map((e, x) => fn(e, { x: x, y: y })))
    }

    matSome(fn: (e: T, index: Point) => boolean) {
        return this.some((line, y) => line.some((e, x) => fn(e, { x: x, y: y })))
    }

    matEvery(fn: (e: T, index: Point) => boolean) {
        return this.every((line, y) => line.every((e, x) => fn(e, { x: x, y: y })))
    }

    matFindIndex(fn: (e: T, index: Point) => boolean): Point | null {
        for (const [y, line] of this.entries()) {
            for (const [x, e] of line.entries()) {
                if (fn(e, { x: x, y: y })) return { x: x, y: y }
            }
        }
        return null
    }

    matFind(fn: (e: T, index: Point) => boolean): T | null {
        for (const [y, line] of this.entries()) {
            for (const [x, e] of line.entries()) {
                if (fn(e, { x: x, y: y })) return e
            }
        }
        return null
    }
}

/** 駒の将棋盤 */
export class PieceBoard extends Board<Piece | null>{
    make() {
        return super.make(null)
    }
}

/** Boolean将棋盤 */
export class BitBoard extends Board<boolean>{
    make() {
        return super.make(false)
    }

    and(rhs: BitBoard): BitBoard {
        let b = new BitBoard()
        b.init(Util.range(0, Board.height - 1).map(y => Util.range(0, Board.width - 1).map(x => this[y][x] && rhs[y][x])))
        return b
    }
    mask(rhs: BitBoard) { return this.and(rhs) }
    or(rhs: BitBoard): BitBoard {
        let b = new BitBoard()
        b.init(Util.range(0, Board.height - 1).map(y => Util.range(0, Board.width - 1).map(x => this[y][x] || rhs[y][x])))
        return b
    }
    exist(): boolean {
        return this.matSome(b => b === true)
    }
}

/** 持ち駒 */
export type Hand = { [P in Player]: Piece[] }

/** 将棋を管理するフレームワーク */
export class Shogi {

    /** 将棋盤 */
    board: PieceBoard

    /** 各プレイヤーの持ち駒 */
    hand: Hand

    /** 現在のターンプレイヤー */
    turnPlayer: Player

    /** 棋譜 */
    score: Score

    constructor() {
        const makeBoard = (): PieceBoard => {
            const place = (board: PieceBoard, player: Player) => {
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

            let b: PieceBoard = new PieceBoard()
            b.make()
            place(b, Player.Black)
            b.applyWithReverse(() => place(b, Player.White))
            return b
        }

        this.board = makeBoard()
        this.hand = { black: [], white: [] }
        this.turnPlayer = Player.Black
        this.score = []
    }

    /** 将棋盤をログに表示 */
    printBoard() {
        const loggedWithOwnerMark = (owner: Player, text: string): string => {
            return (owner === Player.Black ? " " : "(") + text + (owner === Player.Black ? " " : ")")
        }

        this.board.forEach(line => {
            console.log(
                line.reduce((log, piece) => {
                    return log + (piece === null ? " 　 " : (() => {
                        switch (piece.type) {
                            case PieceType.Bishop:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "馬" : "角")
                            case PieceType.GoldGeneral:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "？" : "金")
                            case PieceType.King:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "？" : piece.owner === Player.Black ? "王" : "玉")
                                break
                            case PieceType.Knight:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "金" : "桂")
                            case PieceType.Lance:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "金" : "香")
                            case PieceType.Pawn:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "と" : "歩")
                            case PieceType.Rook:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "竜" : "飛")
                            case PieceType.SilverGeneral:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "金" : "銀")
                        }
                    })())
                }, ""))
        })
    }

    /** 文字列に変換する（履歴は無視される） */
    toString(): string {
        const toString = (player: Player) => player === Player.Black ? "0" : "1"
        let data = ""
        data += toString(this.turnPlayer) + ","
        data += this.hand[Player.Black].map(p => p.type).sort().join("") + ","
        data += this.hand[Player.White].map(p => p.type).sort().join("") + ","
        data += (() => {
            let res = ""
            for (const [y, line] of this.board.entries()) {
                for (const [x, piece] of line.entries()) {
                    res += (piece ? piece.type.toString() + toString(piece.owner) + (piece.isPromote ? "1" : "0") : "_")
                    if (x !== Board.width - 1) res += "-"
                }
                if (y !== Board.height - 1) res += ","
            }
            return res
        })()
        return data
    }

    /** 文字列から作る（履歴は無視される） */
    fromString(_data: string) {
        Shogi.fromString(this, _data)
    }

    /** 文字列から作る（履歴は無視される） */
    static fromString(shogi: Shogi, _data: string) {
        const fromString = (player: string) => player === "0" ? Player.Black : Player.White
        const data = _data.split(",")
        shogi.turnPlayer = fromString(data[0])
        shogi.hand[Player.Black] = [...data[1]].map(type => new Piece(parseInt(type), Player.Black))
        shogi.hand[Player.White] = [...data[2]].map(type => new Piece(parseInt(type), Player.White))
        shogi.board.init(data.slice(3, 3 + Board.height).map(line => line.split("-").map(d => {
            if (d === "_") return null
            else {
                let p = new Piece(parseInt(d[0]), fromString(d[1]))
                p.isPromote = d[2] === "1" ? true : false
                return p
            }
        })))
        return shogi
    }

    /** 駒を動かせるかチェックする */
    checkCanMove(from: Point, to: Point, doPromote: boolean = false, skipFoul: boolean = false): Ok | MoveError {
        // 将棋盤からはみ出ている
        if (!this.board.inBound(from) || !this.board.inBound(to)) { return { type: "move_error", reason: new NoPieceError() } }

        const takenPiece = this.board.at(to)
        const movedPiece = this.board.at(from)

        /// fromの位置に動かせる駒があるか

        // そこに駒が置かれていない
        if (movedPiece === null) { return { type: "move_error", reason: new NoPieceError() } }
        // 相手の駒を動かそうとしている
        else if (movedPiece.owner !== this.turnPlayer) { return { type: "move_error", reason: new NoPieceError() } }

        /// 駒を動かせるか

        // 駒の制約的に動かせない場所に動かそうとしている
        if (!Shogi.isRestrictionPieceConstraits(movedPiece, from).at(to)) { return { type: "move_error", reason: new CantMoveError() } }
        // 動かそうとすると他の駒とぶつかる
        else if (this.isCollideWithOtherPieces(movedPiece, from, to)) { return { type: "move_error", reason: new CantMoveError() } }
        // 置かれる場所に自分の駒がある
        else if (takenPiece && takenPiece.owner === this.turnPlayer) { return { type: "move_error", reason: new CantMoveError() } }

        /// 成れるか

        // 既に成っているのに成ろうとしている
        if (movedPiece.isPromote && doPromote) { return { type: "move_error", reason: new CantPromoteError() } }
        // 成ることのできない駒なのに成ろうとしている
        else if (doPromote && !Piece.canPromote(movedPiece.type)) { return { type: "move_error", reason: new CantPromoteError() } }

        if (!skipFoul) {
            /// 反則

            const nextShogi = (() => {
                let newShogi = Util.deepCopy(this)
                const newPiece = newShogi.board.at(from) as Piece
                newShogi.move(from, to, doPromote, true)
                return newShogi
            })()

            // 王手放置
            if (Shogi.checkNeglectKing(nextShogi, this.turnPlayer === Player.Black ? Player.White : Player.Black)) { return { type: "move_error", reason: new NeglectKingError() } }
        }

        /// OK

        return { type: "ok" }
    }

    /** 駒を進める */
    move(from: Point, to: Point, doPromote: boolean = false, skipFoul: boolean = false): Ok | MoveError {
        const canMove = this.checkCanMove(from, to, doPromote, skipFoul)
        if (canMove.type === "ok") {
            const takenPiece = this.board.at(to)
            const movedPiece = this.board.at(from) as Piece

            // 成りたいのであれば成る
            if (doPromote) movedPiece.isPromote = true

            // 駒を取れたら持ち駒に加える
            if (takenPiece) {
                let newHandPiece = takenPiece
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
                from: from,
                isPromoted: movedPiece.isPromote || doPromote,
                id: this.toString()
            })

            // 交代
            this.changePlayer()
        }
        return canMove
    }

    /** 持ち駒をそこに置けるかチェック */
    checkCanPlaceHandPiece(piece: Piece, pos: Point, skipFoul: boolean = false): Ok | PutError {
        // 将棋盤からはみ出ている
        if (!this.board.inBound(pos)) { return { type: "put_error", reason: new BoundError() } }

        // 持ち駒ではない
        if (!this.hand[this.turnPlayer].includes(piece)) { return { type: "put_error", reason: new NoPieceError() } }

        // 相手の持ち駒を動かそうとしている
        if (piece.owner !== this.turnPlayer) { return { type: "put_error", reason: new NoPieceError() } }


        // 他の駒がある場所には置けない
        if (this.board.at(pos) !== null) { return { type: "put_error", reason: new DuplicateError() } }

        // 動けない位置に持ち駒を置いてはいけない
        if (piece.type === PieceType.Pawn && pos.y === piece.lookY(0)) return { type: "put_error", reason: new CantMoveError() }
        if (piece.type === PieceType.Lance && pos.y === piece.lookY(0)) return { type: "put_error", reason: new CantMoveError() }
        if (piece.type === PieceType.Knight && (pos.y == piece.lookY(0) || pos.y == piece.lookY(1))) return { type: "put_error", reason: new CantMoveError() }

        if (!skipFoul) {
            const nextShogi = (() => {
                let newShogi = Util.deepCopy(this)
                const pieceHandPos = this.hand[this.turnPlayer].indexOf(piece)
                const newPiece = newShogi.hand[this.turnPlayer][pieceHandPos]
                newShogi.placeHandPiece(newPiece, pos, true)
                return newShogi
            })()

            // 打ち歩詰め
            const checkStrike = (): boolean => {
                if (piece.type === PieceType.Pawn && pos.y != 0) {
                    const frontPiece = this.board.at({ x: pos.x, y: pos.y - 1 })
                    if (frontPiece && frontPiece.type === PieceType.King && frontPiece.owner !== this.turnPlayer) {
                        return true
                    }
                }
                return false
            }
            if (checkStrike()) return { type: "put_error", reason: new StrikingError() }

            // ２歩
            if (this.board.reduce((sum, line) => {
                const p = line[pos.x]
                return sum += (p !== null && p.owner === piece.owner && p.type === PieceType.Pawn) ? 1 : 0
            }, 0) === 2) return { type: "put_error", reason: new DoublePawnError() }

            // 王手放置
            else if (Shogi.checkNeglectKing(nextShogi, this.turnPlayer === Player.Black ? Player.White : Player.Black)) { return { type: "put_error", reason: new NeglectKingError() } }
        }

        // Ok
        return { type: "ok" }

    }

    /** 持ち駒を置く */
    placeHandPiece(piece: Piece, pos: Point, skipFoul: boolean = false): Ok | PutError {
        const canPut = this.checkCanPlaceHandPiece(piece, pos, skipFoul)
        if (canPut.type == "ok") {
            // 置く
            this.board.assign(pos, piece)

            // 持ち駒から取り除く
            this.hand[this.turnPlayer] = this.hand[this.turnPlayer].filter(p => p !== piece)

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
            this.changePlayer()
        }
        return canPut
    }

    /** 駒pieceの将棋盤における位置を得る */
    getPosition(piece: Piece): Point | null {
        for (const [y, line] of this.board.entries()) {
            for (const [x, p] of line.entries()) {
                if (p === piece) return { x: x, y: y }
            }
        }
        return null
    }

    /** プレイヤーを交代する */
    private changePlayer() {
        this.turnPlayer = this.turnPlayer === Player.Black ? Player.White : Player.Black
    }

    /** 反則チェック */
    checkFoul(): Ok | Foul {
        // 千日手
        if (this.checkThousandDays()) { return { type: "foul", reason: new ThousandDaysFoul() } }

        return { type: "ok" }
    }

    /** pieceが移動できる座標を示すbitboardを返す */
    findReachedArea(piece: Piece, skipFoul: boolean = false): BitBoard | ShogiError {
        // 盤面にある自分の駒ではない
        if (this.getPosition(piece) === null || piece.owner !== this.turnPlayer) return new ShogiError("盤面にある自分の駒ではない")

        const piecePos = this.getPosition(piece) as Point
        let b = new BitBoard()
        b.init(this.board.matMap((_, pos) => this.checkCanMove(piecePos, pos, false, skipFoul).type === "ok"))
        return b
    }

    /** 持ち駒のpieceが置ける座標を示すbitboardを返す */
    findPlaceableArea(piece: Piece): BitBoard | ShogiError {
        // 持ち駒ではない
        if (!this.hand[this.turnPlayer].includes(piece)) return new ShogiError("持ち駒ではない")

        const piecePos = this.getPosition(piece) as Point
        let b = new BitBoard()
        b.init(this.board.matMap((_, pos) => this.checkCanMove(piecePos, pos, false) === { type: "ok" }))
        return b
    }

    /** 詰みチェック */
    checkCheckMate(): boolean {
        // 全ての行動にたいして`checkNeglectKing()`がTrueであれば詰み
        const challenger = this.turnPlayer
        const opponent = this.turnPlayer === Player.Black ? Player.White : Player.Black

        // 可能な駒の移動をすべて試す
        const challengerPieceList = this.board.flatMap(line => line.filter(piece => piece !== null && piece.owner === challenger)) as Piece[]
        const checkMateEvenIfMove = challengerPieceList.some(piece => {
            const piecePos = this.getPosition(piece) as Point
            const reachedPosList = this.board.matReduce<Point[]>((posList, _, pos) => {
                if (this.checkCanMove(piecePos, pos, false) === { type: "ok" }) posList.push(pos)
                return posList
            }, [])
            return reachedPosList.some(dstPos => {
                let shogi: Shogi = Util.deepCopy(this)
                shogi.move(piecePos, dstPos, false)
                return Shogi.checkNeglectKing(shogi, opponent)
            })
        })

        // 可能な持ち駒の設置をすべて試す
        const challengerHandList = this.hand[challenger]
        const checkMateEvenIfPut = challengerHandList.some(piece => {
            const placeablePosList = this.board.matReduce<Point[]>((posList, _, pos) => {
                if (this.checkCanPlaceHandPiece(piece, pos) === { type: "ok" }) posList.push(pos)
                return posList
            }, [])
            return placeablePosList.some(dstPos => {
                let shogi: Shogi = Util.deepCopy(this)
                const pieceHandPos = this.hand[challenger].indexOf(piece)
                const newPiece = shogi.hand[challenger][pieceHandPos]
                shogi.placeHandPiece(newPiece, dstPos)
                return Shogi.checkNeglectKing(shogi, opponent)
            })
        })

        return checkMateEvenIfMove || checkMateEvenIfPut
    }

    /** 動かす時他の駒にぶつかるか */
    isCollideWithOtherPieces(piece: Piece, from: Point, to: Point): boolean {
        const _isCollideWithOtherPieces = (): boolean => {
            switch (piece.type) {
                case PieceType.King:
                case PieceType.GoldGeneral:
                case PieceType.Knight:
                case PieceType.Pawn:
                case PieceType.SilverGeneral:
                    return false
                case PieceType.Lance:
                    switch (piece.isPromote) {
                        case true:
                            return false
                        case false:
                            return Util.range(to.y + 1, from.y - 1).some(y => this.board[y][from.x] !== null)
                    }
                case PieceType.Rook:
                    if (from.x !== to.x && from.y !== to.y) return false
                    else if (from.x == to.x) {
                        const minY = Util.min(from.y, to.y)
                        const maxY = Util.max(from.y, to.y)
                        return Util.range(minY + 1, maxY - 1).some(y => this.board[y][from.x] !== null)
                    }
                    else if (from.y == to.y) {
                        const minX = Util.min(from.x, to.x)
                        const maxX = Util.max(from.x, to.x)
                        return Util.range(minX + 1, maxX - 1).some(x => this.board[from.y][x] !== null)
                    }
                    else {
                        throw new ShogiError("")
                    }
                case PieceType.Bishop:
                    if (from.x === to.x && from.y === to.y) return false
                    else if (from.x < to.x && from.y < to.y) {
                        // 左上 -> 右下
                        const dif = to.x - from.x
                        return Util.range(1, dif - 1 - 1).some(n => this.board[from.y + n][from.x + n] !== null)
                    }
                    else if (from.x < to.x && from.y > to.y) {
                        // 左下 -> 右上
                        const dif = to.x - from.x
                        return Util.range(1, dif - 1 - 1).some(n => this.board[from.y - n][from.x + n] !== null)
                    }
                    else if (from.x > to.x && from.y < to.y) {
                        // 右上 -> 左下
                        const dif = from.x - to.x
                        return Util.range(1, dif - 1 - 1).some(n => this.board[from.y + n][from.x - n] !== null)
                    }
                    else if (from.x > to.x && from.y > to.y) {
                        // 右下 -> 左上
                        const dif = from.x - to.x
                        return Util.range(1, dif - 1 - 1).some(n => this.board[from.y - n][from.x - n] !== null)
                    } else {
                        throw new ShogiError("")
                    }
            }
        }

        let board = new BitBoard()
        board.make()
        switch (piece.owner) {
            case Player.Black:
                return _isCollideWithOtherPieces()
            case Player.White:
                return board.applyWithReverse(_isCollideWithOtherPieces)
        }
    }

    /** 王手放置チェック */
    checkNeglectKing(): boolean {
        return Shogi.checkNeglectKing(this, this.turnPlayer)
    }

    /** 王手放置チェック */
    static checkNeglectKing(nextShogi: Shogi, nextTurnPlayer: Player): boolean {
        const currentTurnPlayer = nextTurnPlayer === Player.Black ? Player.White : Player.Black
        const kingPosition = nextShogi.board.matFindIndex(p => p !== null && p.owner === currentTurnPlayer && p.type === PieceType.King)
        if (!kingPosition) throw new ShogiError("王将がいません")
        const kingPositionBitBoard = (() => {
            let b = new BitBoard()
            b.make()
            b.assign(kingPosition, true)
            return b
        })()

        // 相手の駒に王将に届く駒があるか判定
        return nextShogi.board.matSome(piece =>
            piece !== null && piece.owner === nextTurnPlayer && (nextShogi.findReachedArea(piece, true) as BitBoard).mask(kingPositionBitBoard).exist())
    }

    /** 千日手チェック */
    checkThousandDays(): boolean {
        const currentId = this.score[this.score.length - 1].id
        const duplicateWithCurrentIdCount = this.score.slice(0, this.score.length - 1).reduce((cnt, score) => {
            const id = score.id
            return cnt + (id === currentId ? 1 : 0)
        }, 0)
        return duplicateWithCurrentIdCount >= 4
    }

    /**
     * 駒が動けるエリアを示すbitboardを返す
     * @param piece 動かす駒
     */
    isRestrictionPieceConstraits(piece: Piece): BitBoard | NoPieceError {
        const piecePos = this.getPosition(piece)

        // 駒が将棋盤上に無い
        if (piecePos === null) { return new NoPieceError }

        return Shogi.isRestrictionPieceConstraits(piece, piecePos)
    }

    /**
     * 駒が動けるエリアを示すbitboardを返す
     * @param piece 動かす駒
     * @param piece 動かす先
     */
    static isRestrictionPieceConstraits(piece: Piece, _pos: Point): BitBoard {
        let board = new BitBoard()
        board.make()

        const _isRestrictionPieceConstraits = (pos: Point): BitBoard => {
            const assign = (pos: Point) => { if (board.inBound(pos)) board.assign(pos, true) }

            const rookAssign = () => {
                Util.range(0, Board.height - 1).forEach(y => y !== pos.y && assign({ x: pos.x, y: y }))
                Util.range(0, Board.width - 1).forEach(x => x !== pos.x && assign({ x: x, y: pos.y }))
            }

            const bishopAssign = () => {
                // 各方向の斜めにみてく
                const diagonalAssign = (dx: integer, dy: integer) => {
                    let p = { x: pos.x, y: pos.y }
                    do {
                        assign({ x: p.x, y: p.y })
                        p.x += dx
                        p.y += dy
                    } while (board.inBound(p))
                }
                diagonalAssign(1, 1)
                diagonalAssign(1, -1)
                diagonalAssign(-1, 1)
                diagonalAssign(-1, -1)
            }

            switch (piece.isPromote) {
                case true:
                    switch (piece.type) {
                        case PieceType.Pawn:
                        case PieceType.Lance:
                        case PieceType.Knight:
                        case PieceType.SilverGeneral:
                            [
                                [true, true, true],
                                [true, false, true],
                                [false, true, false]
                            ]
                                .forEach((line, y) => line.forEach((p, x) => p && assign({ x: pos.x + (x - 1), y: pos.y + (y - 1) })))
                            return board
                        case PieceType.Rook:
                            rookAssign()
                            Util.range(-1, 1).forEach(y => Util.range(-1, 1).forEach(x => assign({ x: pos.x + x, y: pos.y + y })))
                            return board
                        case PieceType.Bishop:
                            bishopAssign()
                            Util.range(-1, 1).forEach(y => Util.range(-1, 1).forEach(x => assign({ x: pos.x + x, y: pos.y + y })))
                            return board
                        case PieceType.GoldGeneral:
                        case PieceType.King:
                            throw new ShogiError("成れない駒が成っています")
                    }
                case false:
                    switch (piece.type) {
                        case PieceType.Pawn:
                            assign({ x: pos.x, y: pos.y - 1 })
                            return board
                        case PieceType.Lance:
                            Util.range(0, pos.y - 1).forEach(y => assign({ x: pos.x, y: y }))
                            return board
                        case PieceType.Knight:
                            assign({ x: pos.x - 1, y: pos.y - 2 })
                            assign({ x: pos.x + 1, y: pos.y - 2 })
                            return board
                        case PieceType.SilverGeneral:
                            [
                                [true, true, true],
                                [false, false, false],
                                [true, false, true]
                            ]
                                .forEach((line, y) => line.forEach((p, x) => p && assign({ x: pos.x + (x - 1), y: pos.y + (y - 1) })))
                            return board
                        case PieceType.GoldGeneral:
                            [
                                [true, true, true],
                                [true, false, true],
                                [false, true, false]
                            ]
                                .forEach((line, y) => line.forEach((p, x) => p && assign({ x: pos.x + (x - 1), y: pos.y + (y - 1) })))
                            return board
                        case PieceType.King:
                            Util.range(-1, 1).forEach(y => Util.range(-1, 1).forEach(x => ({ x: x, y: y } !== pos) && assign({ x: pos.x + x, y: pos.y + y })))
                            return board
                        case PieceType.Rook:
                            rookAssign()
                            return board
                        case PieceType.Bishop:
                            bishopAssign()
                            return board
                        default:
                            throw new ShogiError("")
                    }
            }
        }

        switch (piece.owner) {
            case Player.Black:
                return _isRestrictionPieceConstraits(_pos)
            case Player.White:
                return board.applyWithReverse(() => _isRestrictionPieceConstraits(Shogi.reversePosition(_pos)))
        }
    }

    static reversePosition(pos: Point): Point {
        return { x: Board.width - 1 - pos.x, y: Board.height - 1 - pos.y }
    }
}
