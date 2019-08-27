import { Board } from "./board";
import { Player } from "./player";
import { Point } from "./util";

/** 駒の種類 */
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

/** 駒を管理するクラス */
export class Piece {
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
        return this.owner === Player.Black ? p : { x: Board.width - 1 - p.x, y: Board.height - 1 - p.y }
    }

    /** 駒から見た盤面の位置X（白番の場合反転する） */
    public lookX(x: integer): integer {
        return this.owner === Player.Black ? x : (Board.width - 1) - x
    }

    /** 駒から見た盤面の位置Y（白番の場合反転する） */
    public lookY(y: integer): integer {
        return this.owner === Player.Black ? y : (Board.height - 1) - y
    }
}
