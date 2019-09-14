import { Board } from "./board"
import { Player } from "./player"
import { Point } from "./util"

/** 駒の種類 */
export enum PieceType {
    /** 王将 */
    King =  "king",
    /** 飛車 */
    Rook =  "rook",
    /** 角行 */
    Bishop = "bishop",
    /** 金将 */
    GoldGeneral= "gold-general",
    /** 銀将 */
    SilverGeneral= "silver-general",
    /** 桂馬 */
    Knight= "knight",
    /** 香車 */
    Lance= "lance",
    /** 歩兵 */
    Pawn= "pawn",
}

/** 駒の動ける方向と回数 */
export type Dir = {
    /** 駒の動ける場所 dP/dt */
    dif: Point,

    /** 駒の動ける回数 t */
    times: integer
}

/** 駒 */
export class Piece {
    /** 駒の種類（成っているかは含めない） */
    public readonly type: PieceType

    /** 駒の所持プレイヤー */
    public owner: Player

    /** 成っているか */
    public isPromote: boolean

    public constructor(type: PieceType, owner: Player) {
        this.type = type
        this.owner = owner
        this.isPromote = false
    }

    /** 駒から見た盤面の位置（白番の場合反転する） */
    public look(p: Point): Point {
        return {x: this.lookX(p.x), y: this.lookY(p.y)}
    }

    /** 駒から見た盤面の位置X（白番の場合反転する） */
    public lookX(x: integer): integer {
        return this.owner === Player.Black ? x : (Board.width - 1) - x
    }

    /** 駒から見た盤面の位置Y（白番の場合反転する） */
    public lookY(y: integer): integer {
        return this.owner === Player.Black ? y : (Board.height - 1) - y
    }

    /** 文字に変換 */
    public toString(): string {
        switch (this.type) {
            case PieceType.Bishop:
                return this.isPromote ? "馬" : "角"
            case PieceType.GoldGeneral:
                return this.isPromote ? "？" : "金"
            case PieceType.King:
                return this.isPromote ? "？" : this.owner === Player.Black ? "王" : "玉"
            case PieceType.Knight:
                return this.isPromote ? "金" : "桂"
            case PieceType.Lance:
                return this.isPromote ? "金" : "香"
            case PieceType.Pawn:
                return this.isPromote ? "と" : "歩"
            case PieceType.Rook:
                return this.isPromote ? "竜" : "飛"
            case PieceType.SilverGeneral:
                return this.isPromote ? "金" : "銀"
        }
    }

    /** 成れる種類の駒か */
    public static canPromote(type: PieceType): boolean {
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

    /** 動ける場所と回数の表 */
    private static MovedirMatrix: {[key in PieceType]: [integer[][], integer[][]]} = {
        [PieceType.Pawn] : [[
            [0, 1, 0],
            [0, 0, 0],
            [0, 0, 0],
        ], [
            [1, 1, 1],
            [1, 0, 1],
            [0, 1, 0],
        ], ],
        [PieceType.Lance] : [[
            [0, Infinity, 0],
            [0, 0, 0],
            [0, 0, 0],
        ], [
            [1, 1, 1],
            [1, 0, 1],
            [0, 1, 0],
        ], ],
        [PieceType.Knight] : [[
            [0, 1, 0, 1, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 1, 0, 1, 0],
        ], [
            [1, 1, 1],
            [1, 0, 1],
            [0, 1, 0],
        ], ],
        [PieceType.SilverGeneral] : [[
            [1, 1, 1],
            [0, 0, 0],
            [1, 0, 1],
        ], [
            [1, 1, 1],
            [1, 0, 1],
            [0, 1, 0],
        ], ],
        [PieceType.GoldGeneral] : [[
            [1, 1, 1],
            [1, 0, 1],
            [0, 1, 0],
        ], [], ],
        [PieceType.Rook] : [[
            [0       , Infinity, 0       ],
            [Infinity, 0       , Infinity],
            [0       , Infinity, 0       ],
        ], [
            [1       , Infinity, 1       ],
            [Infinity, 0       , Infinity],
            [1       , Infinity, 1       ],
        ], ],
        [PieceType.Bishop] : [[
            [Infinity, 0       , Infinity],
            [0       , 0       , 0       ],
            [Infinity, 0       , Infinity],
        ], [
            [Infinity, 1       , Infinity],
            [1       , 0       , 1       ],
            [Infinity, 1       , Infinity],
        ], ],
        [PieceType.King] : [[
            [1, 1, 1],
            [1, 0, 1],
            [1, 1, 1],
        ], [], ],
    }

    /**
     * 駒の動かせる方向と回数のリスト
     *
     * 数値は何回動かせるかを示す
     */
    public static MovableDir: {[pieceTypeKey in PieceType]: {[isPromotedKey in  "normal" | "promoted"]: Dir[]}} =
    (() => {
        const dirDict: {[pieceTypeKey in string]: {[isPromotedKey in  "normal" | "promoted"]: Dir[]}} = {}
        for (const [type, mats] of Object.entries(Piece.MovedirMatrix)) {
            const makeDirPositionList = (mat: integer[][]): Dir[] => {
                if (mat.length === 0) {
                    return []
                }
                const offsetY: integer = Math.floor(mat.length / 2)
                const offsetX: integer = offsetY
                return mat.map((line, y) =>
                    line.map((times, x) => (
                        {dif: {x: x - offsetX, y: y - offsetY}, times}
                    )).filter(dir => dir.times !== 0)
                ).flat()
            }

            dirDict[type as PieceType] = {
                normal: makeDirPositionList(mats[0]),
                promoted: makeDirPositionList(mats[1]),
            }
        }
        return dirDict as  {[pieceTypeKey in PieceType]: {[isPromotedKey in  "normal" | "promoted"]: Dir[]}}
    })()
}
