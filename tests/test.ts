import * as Shogi from '../src/library/shogi/shogi';
import * as assert from "power-assert";


const snap = (obj: any) => expect(obj).toMatchSnapshot()
const readConsoleOutput = (fn: () => void): string => {
    let output = ""
    const storeLog = (inputs: string) => (output += inputs);
    console["log"] = jest.fn(storeLog);
    fn()
    return output
}

// 初期状態
let shogi: Shogi.Shogi

beforeEach(() => {
    shogi = new Shogi.Shogi()
})

test('インスタンスを作れるか', () => {
    assert(shogi instanceof Shogi.Shogi)
});

test('将棋盤が初期化されているか', () => {
    snap(shogi.board)
})

test('将棋盤を表示できるか', () => {
    snap(readConsoleOutput(() => shogi.printBoard()))
})
