import { BitBoard, Board, PieceBoard } from "./board"
// tslint:disable-next-line:max-line-length
import { BoundError, CantMoveError, CantPromoteError, DoublePawnFoul, DuplicateError, FoulError, MoveError, NeglectKingFoul , NoPieceError, NotOwnedPieceError, ShogiError, StrikingFoul, ThousandDaysFoul } from "./errors"
import { Piece, PieceType } from "./piece"
import { Player } from "./player"
import { deepCopy, interpolation, interpolation2D, isSameInstance, max, min, Point, range } from "./util"

/** OK */
export type Ok = {
    /** type */
    type: "ok"
}

/** 駒を動かせない */
export type MoveNotAllowedError = {
    /** 駒を置けない理由 */
    reason: NoPieceError | NotOwnedPieceError | CantMoveError | CantPromoteError | NeglectKingFoul
    /** type */
    type: "move_error"
}

/** 駒を置けない */
export type PlacementNotAllowedError = {
    /** 駒を置けない理由 */
    reason: BoundError | NotOwnedPieceError | DuplicateError
     | CantMoveError | StrikingFoul | DoublePawnFoul | NeglectKingFoul
    /** type */
    type: "put_error"
}

/** 指し手のログ */
export type MoveLog = {

    // TODO: たどり着ける同じ種類の駒が複数あった場合の表記に対応する

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
    readonly pieceType: PieceType,
    /** 指したプレイヤー */
    readonly player: Player,
    /** 駒が置かれた位置 */
    readonly position: Point,
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
    private changePlayer(): void {
        this.turnPlayer = this.turnPlayer === Player.Black ? Player.White : Player.Black
    }

    /** 駒を進める */
    public move(
        from: Point,
        to: Point,
        doPromote: boolean = false,
        skipFoul: boolean = false
    ): Ok | MoveNotAllowedError {
        const canMove: Ok | MoveNotAllowedError = this.checkCanMove(from, to, doPromote, skipFoul)
        if (canMove.type === "ok") {
            const takenPiece: Piece | null = this.board.at(to)
            const movedPiece: Piece = this.board.at(from) as Piece

            // 成りたいのであれば成る
            if (doPromote) { movedPiece.isPromote = true }

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
                id: this.toString(),
            })

            // 交代
            this.changePlayer()
        }
        return canMove
    }

    /** 持ち駒を置く */
    public placeHandPiece(piece: Piece, pos: Point, skipFoul: boolean = false): Ok | PlacementNotAllowedError {
        const canPut: Ok | PlacementNotAllowedError = this.checkCanPlaceHandPiece(piece, pos, skipFoul)
        if (canPut.type === "ok") {
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
                id: this.toString(),
            })

            // 交代
            this.changePlayer()
        }

        return canPut
    }

    /// Public utils

    /**
     * 駒が動けるエリアを示すbitboardを返す
     * @param piece 動かす駒
     */
    public isRestrictionPieceConstraits(piece: Piece): BitBoard | NoPieceError {
        const piecePos: Point | null = this.getPosition(piece)

        // 駒が将棋盤上に無い
        if (piecePos === null) { return new NoPieceError() }

        return Shogi.isRestrictionPieceConstraits(piece, piecePos)
    }

    /**
     * 駒が動けるエリアを示すbitboardを返す
     * @param piece 動かす駒
     * @param piece 動かす先
     */
    public static isRestrictionPieceConstraits(piece: Piece, _pos: Point): BitBoard {
        const board: BitBoard = BitBoard.init()

        const _isRestrictionPieceConstraits = (pos: Point): BitBoard => {
            const assign = (p: Point) => { if (Board.inBound(p)) { board.assign(p, true) } }

            const rookAssign = () => {
                range(0, Board.height - 1).filter(y => y !== pos.y).forEach(y => assign({ x: pos.x, y }))
                range(0, Board.width - 1).filter(x => x !== pos.x).forEach(x => assign({ x, y: pos.y }))
            }

            const bishopAssign = () => {
                // 各方向の斜めにみてく
                const diagonalAssign = (dx: integer, dy: integer) => {
                    let [x, y]: [integer, integer] = [pos.x, pos.y]
                    do {
                        assign({ x, y })
                        x += dx
                        y += dy
                    } while (Board.inBound({x, y}))
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
                                [false, true, false],
                            ]
                            .forEach((line, y) => line.forEach((p, x) => {
                                if (p) { assign({ x: pos.x + (x - 1), y: pos.y + (y - 1) }) }
                            }))
                            return board
                        case PieceType.Rook:
                            rookAssign()
                            range(-1, 1).forEach(y => range(-1, 1).forEach(x => {
                                assign({ x: pos.x + x, y: pos.y + y })
                            }))
                            return board
                        case PieceType.Bishop:
                            bishopAssign()
                            range(-1, 1).forEach(y => range(-1, 1).forEach(x => {
                                assign({ x: pos.x + x, y: pos.y + y })
                            }))
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
                            range(0, pos.y - 1).forEach(y => assign({ x: pos.x, y }))
                            return board
                        case PieceType.Knight:
                            assign({ x: pos.x - 1, y: pos.y - 2 })
                            assign({ x: pos.x + 1, y: pos.y - 2 })
                            return board
                        case PieceType.SilverGeneral:
                            [
                                [true, true, true],
                                [false, false, false],
                                [true, false, true],
                            ]
                            .forEach((line, y) => line.forEach((p, x) => {
                                if (p) { assign({ x: pos.x + (x - 1), y: pos.y + (y - 1) })}
                            }))
                            return board
                        case PieceType.GoldGeneral:
                            [
                                [true, true, true],
                                [true, false, true],
                                [false, true, false],
                            ]
                            .forEach((line, y) => line.forEach((p, x) => {
                                if (p) { assign({ x: pos.x + (x - 1), y: pos.y + (y - 1) })}
                            }))
                            return board
                        case PieceType.King:
                            range(-1, 1).forEach(y => range(-1, 1).forEach(x => {
                                if (!(pos.x === x && pos.y === y)) { assign({ x: pos.x + x, y: pos.y + y })}
                            }))
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

        const reversePosition = (pos: Point): Point =>
            ({ x: Board.width - 1 - pos.x, y: Board.height - 1 - pos.y })

        switch (piece.owner) {
            case Player.Black:
                return _isRestrictionPieceConstraits(_pos)
            case Player.White:
                return board.applyWithReverse(() => _isRestrictionPieceConstraits(reversePosition(_pos)))
        }
    }

    /** 駒を動かせるかチェックする */
    public checkCanMove(
        from: Point,
        to: Point,
        doPromote: boolean = false,
        skipFoul: boolean = false
    ): Ok | MoveNotAllowedError {
        // 将棋盤からはみ出ている
        if (!Board.inBound(from) || !Board.inBound(to)) {
            return { type: "move_error", reason: new NoPieceError() }
        }

        const takenPiece: Piece | null = this.board.at(to)
        const movedPiece: Piece | null = this.board.at(from)

        /// Fromの位置に動かせる駒があるか

        // そこに駒が置かれていない
        if (movedPiece === null) { return { type: "move_error", reason: new NoPieceError() } }
        // 相手の駒を動かそうとしている
        if (movedPiece.owner !== this.turnPlayer) { return { type: "move_error", reason: new NotOwnedPieceError() } }

        /// 駒を動かせるか

        // 駒の制約的に動かせない場所に動かそうとしている
        if (!(this.isRestrictionPieceConstraits(movedPiece) as BitBoard).at(to)) {
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
        if (movedPiece.isPromote && doPromote) { return { type: "move_error", reason: new CantPromoteError() } }
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

            // 王手放置
            if (Shogi.checkNeglectKing(nextShogi, this.turnPlayer === Player.Black ? Player.White : Player.Black)) {
                return { type: "move_error", reason: new NeglectKingFoul() }
            }
        }

        /// OK

        return { type: "ok" }
    }

    /** 持ち駒をそこに置けるかチェック */
    public checkCanPlaceHandPiece(piece: Piece, pos: Point, skipFoul: boolean = false): Ok | PlacementNotAllowedError {
        // 将棋盤からはみ出ている
        if (!Board.inBound(pos)) { return { type: "put_error", reason: new BoundError() } }

        // 持ち駒ではない
        if (!this.hand[this.turnPlayer].includes(piece)) { return { type: "put_error", reason: new NoPieceError() } }

        // 相手の持ち駒を動かそうとしている
        if (piece.owner !== this.turnPlayer) { return { type: "put_error", reason: new NotOwnedPieceError() } }

        // 他の駒がある場所には置けない
        if (this.board.at(pos) !== null) { return { type: "put_error", reason: new DuplicateError() } }

        // 動けない位置に持ち駒を置いてはいけない
        if (piece.type === PieceType.Pawn && pos.y === piece.lookY(0)) {
            return { type: "put_error", reason: new CantMoveError() }
        }
        if (piece.type === PieceType.Lance && pos.y === piece.lookY(0)) {
            return { type: "put_error", reason: new CantMoveError() }
        }
        if (piece.type === PieceType.Knight && (pos.y === piece.lookY(0) || pos.y === piece.lookY(1))) {
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
                    return frontPiece !== null
                        && frontPiece.type === PieceType.King
                        && frontPiece.owner !== this.turnPlayer
                }
                return false
            }
            if (checkStrike()) { return { type: "put_error", reason: new StrikingFoul() } }

            // ２歩
            if (nextShogi.board.reduce((sum, line) => {
                const p: Piece | null = line[pos.x]
                return sum + ((p !== null && p.owner === piece.owner && p.type === PieceType.Pawn) ? 1 : 0)
            }, 0) === 2) {
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
        // 全ての行動にたいして`checkNeglectKing()`がTrueであれば詰み
        const challenger: Player = this.turnPlayer
        const opponent: Player = this.turnPlayer === Player.Black ? Player.White : Player.Black

        // 可能な駒の移動をすべて試す
        const challengerPieceList: Piece[] = this.board.flatMap((line) =>
            line.filter((piece) => piece !== null && piece.owner === challenger)) as Piece[]
        const checkMateEvenIfMove: boolean = challengerPieceList.some((piece) => {
            const piecePos: Point = this.getPosition(piece) as Point
            const reachedPosList: Point[] = this.board.matReduce<Point[]>((posList, _, pos) => {
                if (this.checkCanMove(piecePos, pos, false).type === "ok") { posList.push(pos) }
                return posList
            }, [])

            return reachedPosList.some((dstPos) => {
                const shogi: Shogi = deepCopy(this)
                shogi.move(piecePos, dstPos, false)
                return Shogi.checkNeglectKing(shogi, opponent)
            })
        })

        // 可能な持ち駒の設置をすべて試す
        const challengerHandPieceList: Piece[] = this.hand[challenger]
        const checkMateEvenIfPut: boolean = challengerHandPieceList.some((piece) => {
            const placeablePosList: Point[] = this.board.matReduce<Point[]>((posList, _, pos) => {
                if (this.checkCanPlaceHandPiece(piece, pos).type === "ok") { posList.push(pos) }
                return posList
            }, [])

            return placeablePosList.some((dstPos) => {
                const shogi: Shogi = deepCopy(this)
                const pieceHandPos: number = this.hand[challenger].indexOf(piece)
                const newPiece: Piece = shogi.hand[challenger][pieceHandPos]
                shogi.placeHandPiece(newPiece, dstPos)
                return Shogi.checkNeglectKing(shogi, opponent)
            })
        })
        return checkMateEvenIfMove || checkMateEvenIfPut
    }

    // TODO: チェックを駒を置けるかチェックする段階で行うように変更
    /** 反則チェック */
    public checkFoul(): Ok | FoulError {
        // 千日手
        if (this.checkThousandDays()) { return new ThousandDaysFoul() }

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
        if (kingPosition === null) { throw new ShogiError("王将がいません") }
        const kingPositionBitBoard: BitBoard = BitBoard.init().assign(kingPosition, true)

        // 相手の駒に王将に届く駒があるか判定
        const opponentPieces: Piece[] = nextShogi.board.matFilter(
            piece => piece !== null && piece.owner === nextTurnPlayer
        ) as Piece[]
        return opponentPieces.some(opponenctPiece =>
            (nextShogi.findReachedArea(opponenctPiece, true) as BitBoard).mask(kingPositionBitBoard).exist()
        )
    }

    /** 千日手チェック */
    public checkThousandDays(): boolean {
        if (this.score.length < 4) { return false }
        const currentId: string = this.score[this.score.length - 1].id
        // 最後の手と同じ手がいくつあるか（最後の手も数える）
        const duplicateWithCurrentIdCount: integer = this.score.slice(0, this.score.length).reduce((cnt, score) => {
            const id: string = score.id
            return cnt + (id === currentId ? 1 : 0)
        }, 0)
        return duplicateWithCurrentIdCount >= 4
    }

    /** 持ち駒のpieceが置ける座標を示すbitboardを返す */
    public findPlaceableArea(piece: Piece): BitBoard | ShogiError {
        // 持ち駒ではない
        if (!this.hand[this.turnPlayer].includes(piece)) { return new ShogiError("持ち駒ではない") }

        const piecePos: Point = this.getPosition(piece) as Point
        return BitBoard.init(this.board.matMap((_, pos) => this.checkCanMove(piecePos, pos, false).type === "ok"))
    }

    /** pieceが移動できる座標を示すbitboardを返す */
    public findReachedArea(piece: Piece, skipFoul: boolean = false): BitBoard | ShogiError {
        // 盤面にある自分の駒ではない
        if (this.getPosition(piece) === null || piece.owner !== this.turnPlayer) {
            return new ShogiError("盤面にある自分の駒ではない")
        }

        const piecePos: Point = this.getPosition(piece) as Point
        const b: BitBoard = new BitBoard()
        return BitBoard.init(this.board.matMap((_, pos) => this.checkCanMove(piecePos, pos, false, skipFoul).type === "ok"))
    }

    /** 動かす時他の駒にぶつかるか */
    public isCollideWithOtherPieces(piece: Piece, from: Point, to: Point): boolean {
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
                            return interpolation(to.y, from.y).some(y => this.board[y][from.x] !== null)
                    }
                case PieceType.Rook:
                    // 横
                    if (from.x === to.x) {return interpolation(from.y, to.y).some(y => this.board[y][from.x] !== null)}
                    // 縦
                    if (from.y === to.y) {return interpolation(from.x, to.x).some(x => this.board[from.y][x] !== null)}
                    // 斜めは１マスしか動けないのでぶつからない
                    return false
                case PieceType.Bishop:
                    // 縦横は１マスしか動けないのでぶつからない
                    if (from.x === to.x || from.y === to.y) { return false }
                    // 斜め
                    return interpolation2D(from, to).some(p => this.board.at(p) !== null)
            }
        }

        const board: BitBoard = BitBoard.init()
        switch (piece.owner) {
            case Player.Black:
                return _isCollideWithOtherPieces()
            case Player.White:
                return board.applyWithReverse(_isCollideWithOtherPieces)
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
        const loggedWithOwnerMark = (owner: Player, text: string): string =>
            (owner === Player.Black ? " " : "(") + text + (owner === Player.Black ? " " : ")")

        this.board.forEach((line) => {
            console.log(
                line.reduce((log, piece) =>
                    log + (piece === null ? " 　 " : (() => {
                        switch (piece.type) {
                            case PieceType.Bishop:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "馬" : "角")
                            case PieceType.GoldGeneral:
                                return loggedWithOwnerMark(piece.owner, piece.isPromote ? "？" : "金")
                            case PieceType.King:
                                return loggedWithOwnerMark(
                                    piece.owner, piece.isPromote ? "？" : piece.owner === Player.Black ? "王" : "玉"
                                )
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
                    })()
                ), "")
            )
        })
    }

    /** 文字列に変換する（履歴は無視される） */
    public toString(): string {
        const toString = (player: Player) => player === Player.Black ? "0" : "1"
        const pieceTypeToNumber = (type: PieceType): integer => {
            switch (type) {
                case PieceType.Pawn:
                    return 0
                case PieceType.Lance:
                    return 1
                case PieceType.Knight:
                    return 2
                case PieceType.SilverGeneral:
                    return 3
                case PieceType.GoldGeneral:
                    return 4
                case PieceType.Bishop:
                    return 5
                case PieceType.Rook:
                    return 6
                case PieceType.King:
                    return 7
            }
        }
        let data: string = ""
        data += `${toString(this.turnPlayer)},`
        data += `${this.hand[Player.Black].map(p => pieceTypeToNumber(p.type)).sort().join("")},`
        data += `${this.hand[Player.White].map(p => pieceTypeToNumber(p.type)).sort().join("")},`
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
                    if (x !== Board.width - 1) { res += "-" }
                }
                if (y !== Board.height - 1) { res += "," }
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
        const fromString = (player: string) => player === "0" ? Player.Black : Player.White
        const pieceFromNumber = (num: integer): PieceType =>
            [
                PieceType.Pawn,
                PieceType.Lance,
                PieceType.Knight,
                PieceType.SilverGeneral,
                PieceType.GoldGeneral,
                PieceType.Bishop,
                PieceType.Rook,
                PieceType.King
            ][num]
        const splitedData: string[] = data.split(",")
        shogi.turnPlayer = fromString(splitedData[0])
        shogi.hand[Player.Black] =
            [...splitedData[1]].map((type) => new Piece(pieceFromNumber(parseInt(type, 10)), Player.Black))
        shogi.hand[Player.White] =
            [...splitedData[2]].map((type) => new Piece(pieceFromNumber(parseInt(type, 10)), Player.White))
        shogi.board = PieceBoard.init(
            splitedData.slice(3, Board.height + 3).map((line) => line.split("-").map(d => {
                if (d === "_") { return null }
                const p: Piece = new Piece(pieceFromNumber(parseInt(d[0], 10)), fromString(d[1]))
                p.isPromote = d[2] === "1" ? true : false

                return p
            })
        ))

        return shogi
    }

    /** 向かいのプレイヤーを返す */
    public static reverse(player: Player): Player {
        return player === Player.Black ? Player.White : Player.Black
    }
}
