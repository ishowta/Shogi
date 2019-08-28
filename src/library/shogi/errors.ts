/** 将棋ライブラリ内エラー */
export class ShogiError implements Error {

    /** エラーメッセージ */
    public message: string
    /** エラー名 */
    public name: string = "ShogiError"

    public constructor(message: string = "") {
        this.message = message
    }

    /** エラー名とメッセージを文字列にして返す */
    public toString(): string {
        return `${this.name} : ${this.message}`
    }
}

/** 指した時のエラー（物理エラー） */
export class MoveError extends ShogiError { }

/** 範囲から出ている */
export class BoundError extends MoveError { }
/** 重複しているところに置こうとした */
export class DuplicateError extends MoveError { }
/** 相手の駒を動かそうとした */
export class NotOwnedPieceError extends MoveError { }
/** 存在しない駒を動かそうとした */
export class NoPieceError extends MoveError { }
/** 動かせない場所に動かそうとした */
export class CantMoveError extends MoveError { }
/** 成れないのに成ろうとした */
export class CantPromoteError extends MoveError { }

/** 指した時の反則（論理エラー） */
export class FoulError extends ShogiError { }

/** 千日手 */
export class ThousandDaysFoul extends FoulError { }
/** 王手放置 */
export class NeglectKingFoul extends FoulError { }
/** 打ち歩詰め */
export class StrikingFoul extends FoulError { }
/** ２歩 */
export class DoublePawnFoul extends FoulError { }
