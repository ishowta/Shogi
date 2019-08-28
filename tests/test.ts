// tslint:disable-next-line:no-implicit-dependencies
import assert from "power-assert"

import { CantPromoteError, NeglectKingFoul, NoPieceError, StrikingFoul, NotOwnedPieceError } from "../src/library/shogi/errors"
import { Piece } from "../src/library/shogi/piece"
import { Player } from "../src/library/shogi/player"
import { Hand, MoveNotAllowedError, Ok, PlacementNotAllowedError, Shogi } from "../src/library/shogi/shogi"
import { Point, range } from "../src/library/shogi/util"

const snap = <T>(obj: T, name?: string) => expect(obj).toMatchSnapshot(name)
const readConsoleOutput = (fn: () => void): string => {
    let output: string = ""
    const storeLog = (inputs: string) => (output += inputs)
    console.log = jest.fn(storeLog)
    fn()
    return output
}
const c: (x: integer, y: integer) => Point = Shogi.c

/** 何手か適当に進める */
const playComplexMove = (s: Shogi) => {
    assert(s.move(c(7, 7), c(7, 6)).type === "ok") // 76歩
    assert(s.move(c(3, 3), c(3, 4)).type === "ok") // 34歩
    assert(s.move(c(8, 8), c(2, 2), true).type === "ok") // 22角成,角取り
    assert(s.move(c(8, 3), c(8, 4)).type === "ok") // 84歩
    const kaku: Piece = s.hand[Player.Black][0]
    assert(s.placeHandPiece(kaku, c(6, 2)).type === "ok") // 62角打, 王手
}

let shogi: Shogi

beforeEach(() => {
    shogi = new Shogi()
})

it("インスタンスを作れるか", () => {
    assert(shogi instanceof Shogi)
})

it("将棋盤が初期化されているか", () => {
    snap(shogi.board)
})

it("正しく駒を動かせているか", () => {
    playComplexMove(shogi)
    snap(shogi.board)
})

it("将棋盤を表示できるか", () => {
    playComplexMove(shogi)
    snap(readConsoleOutput(() => shogi.printBoard()))
})

it("将棋盤を文字列に変換・逆変換できるか", () => {
    playComplexMove(shogi)
    snap(shogi.toString())
    const newShogi: Shogi = new Shogi()
    newShogi.fromString(shogi.toString())
    assert.deepEqual(newShogi.board, shogi.board)
    assert.deepEqual(newShogi.hand, shogi.hand)
    assert.deepEqual(newShogi.turnPlayer, shogi.turnPlayer)
    // 棋譜は保存されない
    // 🙅 assert(newShogi.score === shogi.score)
})

it("成れるか", () => {
    assert(shogi.move(c(7, 7), c(7, 6)).type === "ok") // 76歩
    assert(shogi.move(c(3, 3), c(3, 4)).type === "ok") // 34歩
    assert(shogi.move(c(8, 8), c(2, 2), true).type === "ok") // 22角成,角取り
    const kaku: Piece | null = shogi.board.at(c(2, 2))
    assert(kaku !== null && kaku.isPromote)
})

it("相手の駒は動かせない", () => {
    const res: Ok | MoveNotAllowedError = shogi.move(c(9, 1), c(9, 2))
    assert(res.type === "move_error" && res.reason instanceof NotOwnedPieceError)
})

it("既に成っているのに成ろうとする", () => {
    assert(shogi.move(c(7, 7), c(7, 6)).type === "ok") // 76歩
    assert(shogi.move(c(3, 3), c(3, 4)).type === "ok") // 34歩
    assert(shogi.move(c(8, 8), c(2, 2), true).type === "ok") // 22角成,角取り
    assert(shogi.move(c(3, 4), c(3, 5)).type === "ok") // 34歩
    const res: Ok | MoveNotAllowedError = shogi.move(c(2, 2), c(1, 1), true) // 11角成(🙅),香取り
    assert(res.type === "move_error" && res.reason instanceof CantPromoteError)
})

it("成ることのできない駒なのに成ろうとする", () => {
    const res: Ok | MoveNotAllowedError = shogi.move(c(5, 9), c(5, 8), true) // 58王成(🙅)
    assert(res.type === "move_error" && res.reason instanceof CantPromoteError)
})

it("打ち歩詰め", () => {
    assert(shogi.move(c(7, 7), c(7, 6)).type === "ok") // 76歩
    assert(shogi.move(c(2, 3), c(2, 4)).type === "ok") // 24歩
    assert(shogi.move(c(8, 8), c(3, 3)).type === "ok") // 33角,歩取り
    assert(shogi.move(c(4, 1), c(4, 2)).type === "ok") // 42金
    const hu: Piece = shogi.hand[shogi.turnPlayer][0]
    const res: Ok | PlacementNotAllowedError = shogi.placeHandPiece(hu, c(5, 2)) // 52歩打,王手(🙅)

    assert(res.type === "put_error" && res.reason instanceof StrikingFoul)
})

it("千日手", () => {
    for (const i of range(1, 4)) {
        assert(!shogi.checkThousandDays())
        assert(shogi.move(c(6, 9), c(6, 8)).type === "ok") // 68金
        assert(shogi.move(c(6, 1), c(6, 2)).type === "ok") // 62金
        assert(shogi.move(c(6, 8), c(6, 9)).type === "ok") // 69金
        assert(shogi.move(c(6, 2), c(6, 1)).type === "ok") // 61金
    }
    assert(shogi.checkThousandDays())
})

it("王手放置", () => {
    assert(shogi.move(c(7, 7), c(7, 6)).type === "ok") // 76歩
    assert(shogi.move(c(3, 3), c(3, 4)).type === "ok") // 34歩
    assert(shogi.move(c(8, 8), c(2, 2)).type === "ok") // 22角,角取り
    assert(shogi.move(c(8, 3), c(8, 4)).type === "ok") // 84歩
    const kaku: Piece = shogi.hand[Player.Black][0]
    assert(shogi.placeHandPiece(kaku, c(6, 2)).type === "ok") // 62角打, 王手
    const res: Ok | MoveNotAllowedError = shogi.move(c(9, 3), c(9, 4)) // 94歩(🙅)

    assert(res.type === "move_error" && res.reason instanceof NeglectKingFoul)
})
