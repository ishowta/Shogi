import * as Shogi from '../src/library/shogi/shogi';
import * as Utils from '../src/library/shogi/util';
import * as assert from "power-assert";

const snap = (obj: any, name?: string) => expect(obj).toMatchSnapshot(name)
const readConsoleOutput = (fn: () => void): string => {
    let output = ""
    const storeLog = (inputs: string) => (output += inputs);
    console["log"] = jest.fn(storeLog);
    fn()
    return output
}

/** 何手か適当に進める */
const playComplexMove = (shogi: Shogi.Shogi) => {
    shogi.move(c(7, 7), c(7, 6)) //76歩
    shogi.move(c(3, 3), c(3, 4)) //34歩
    shogi.move(c(8, 8), c(2, 2), true) //22角成,角取り
    shogi.move(c(8, 3), c(8, 4)) //84歩
    const kaku = shogi.hand[Shogi.Player.Black][0]
    shogi.placeHandPiece(kaku, c(6, 2)) //62角打, 王手
}

const c = Shogi.Shogi.c

let shogi: Shogi.Shogi

beforeEach(() => {
    shogi = new Shogi.Shogi()
})

it('インスタンスを作れるか', () => {
    assert(shogi instanceof Shogi.Shogi)
});

it('将棋盤が初期化されているか', () => {
    snap(shogi.board)
})

it('正しく駒を動かせているか', () => {
    playComplexMove(shogi)
    snap(shogi.board)
})

it('将棋盤を表示できるか', () => {
    playComplexMove(shogi)
    snap(readConsoleOutput(() => shogi.printBoard()))
})

it('将棋盤を文字列に変換・逆変換できるか', () => {
    playComplexMove(shogi)
    snap(shogi.toString())
    const newShogi = new Shogi.Shogi()
    newShogi.fromString(shogi.toString())
    assert.deepEqual(newShogi.board, shogi.board)
    assert.deepEqual(newShogi.hand, shogi.hand)
    assert.deepEqual(newShogi.turnPlayer, shogi.turnPlayer)
    // 棋譜は保存されない
    // 🙅 assert(newShogi.score === shogi.score)
})

it('成れるか', () => {
    shogi.move(c(7, 7), c(7, 6)) //76歩
    shogi.move(c(3, 3), c(3, 4)) //34歩
    shogi.move(c(8, 8), c(2, 2), true) //22角成,角取り
    const kaku = shogi.board.at(c(2, 2))
    assert(kaku && kaku.isPromote === true)
})

it('相手の駒は動かせない', () => {
    const res = shogi.move(c(9, 1), c(9, 2))
    assert(res.type === "move_error" && res.reason instanceof Shogi.NoPieceError)
})

it('既に成っているのに成ろうとする', () => {
    shogi.move(c(7, 7), c(7, 6)) //76歩
    shogi.move(c(3, 3), c(3, 4)) //34歩
    shogi.move(c(8, 8), c(2, 2), true) //22角成,角取り
    shogi.move(c(3, 4), c(3, 5)) //34歩
    const res = shogi.move(c(2, 2), c(1, 1), true) //11角成(🙅),香取り
    assert(res.type === "move_error" && res.reason instanceof Shogi.CantPromoteError)
})

it('成ることのできない駒なのに成ろうとする', () => {
    const res = shogi.move(c(5, 9), c(5, 8), true) //58王成(🙅)
    assert(res.type === "move_error" && res.reason instanceof Shogi.CantPromoteError)
})

it('打ち歩詰め', () => {
    shogi.move(c(7, 7), c(7, 6)) //76歩
    shogi.move(c(2, 3), c(2, 4)) //24歩
    shogi.move(c(8, 8), c(3, 3)) //33角,歩取り
    shogi.move(c(4, 1), c(4, 2)) //42金
    const hu = shogi.hand[shogi.turnPlayer][0]
    const res = shogi.placeHandPiece(hu, c(5, 2)) //52歩打,王手(🙅)

    assert(res.type === "put_error" && res.reason instanceof Shogi.StrikingError)
})

it('千日手', () => {
    for (const i of Utils.range(1, 4)) {
        assert(shogi.checkThousandDays() === false)
        shogi.move(c(6, 9), c(6, 8)) //68金
        shogi.move(c(6, 1), c(6, 2)) //62金
        shogi.move(c(6, 8), c(6, 9)) //69金
        shogi.move(c(6, 2), c(6, 1)) //61金
    }
    assert(shogi.checkThousandDays() === true)
})

it('王手放置', () => {
    shogi.move(c(7, 7), c(7, 6)) //76歩
    shogi.move(c(3, 3), c(3, 4)) //34歩
    shogi.move(c(8, 8), c(2, 2)) //22角,角取り
    shogi.move(c(8, 3), c(8, 4)) //84歩
    const kaku = shogi.hand[Shogi.Player.Black][0]
    shogi.placeHandPiece(kaku, c(6, 2)) //62角打, 王手
    const res = shogi.move(c(9, 3), c(9, 4)) //94歩(🙅)

    assert(res.type === "move_error" && res.reason instanceof Shogi.NeglectKingError)
})
