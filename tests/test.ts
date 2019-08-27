import * as Shogi from '../src/library/shogi/shogi';
import * as assert from "power-assert";

function snap(obj: any) { expect(obj).toMatchSnapshot() }

// 初期状態
let shogi: Shogi.Shogi

beforeEach(() => {
    shogi = new Shogi.Shogi()
})

test('インスタンスを作れるか', () => {
    assert(shogi instanceof Shogi.Shogi)
});
