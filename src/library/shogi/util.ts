/* tslint:disable:no-any no-unsafe-any binary-expression-operand-order one-variable-per-declaration typedef no-for-in */
/**
 * オブジェクトをdeepCopyする
 *
 * 参考：https://stackoverflow.com/questions/28150967/typescript-cloning-object
 * @param obj オブジェクト
 */
export const deepCopy = <T>(obj: T): T => {
    let copy: any

    // Handle the 3 simple types, and null or undefined
    if (null === obj || "object" !== typeof obj) { return obj }

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date()
        copy.setTime(obj.getTime())
        copy.__proto__ = (obj as any).__proto__
        return copy
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = []
        for (let i = 0, len = obj.length; i < len; i += 1) {
            copy[i] = deepCopy(obj[i])
        }
        copy.__proto__ = (obj as any).__proto__
        return copy
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {}
        for (const attr in obj) {
            if ((obj as any).hasOwnProperty(attr)) { copy[attr] = deepCopy(obj[attr]) }
        }
        copy.__proto__ = (obj as any).__proto__
        return copy
    }

    throw new Error("Unable to copy obj! Its type isn't supported.")
}

/**
 * 範囲を指定して配列を生成する
 *
 * 参考：https://qiita.com/kmdsbng/items/f43dce6794f660e382da
 * @param start 左端
 * @param end 右端
 */
export const range = (start: integer, end: integer): integer[] =>
    Array.from({ length: (end - start + 1) }, (v, k) => k + start)

/** 小さい方の値を返す */
export const min = (a: integer, b: integer) => a <= b ? a : b

/** 大きい方の値を返す */
export const max = (a: integer, b: integer) => a > b ? a : b

/** ２次元座標 */
export type Point = {
    /** x軸 */
    readonly x: integer
    /** y軸 */
    readonly y: integer
}

/** aとbの間にある座標のリストを返す（aやbは含まない） */
export const interpolation = (c: integer, d: integer): integer[] =>
        range(min(c, d) + 1, max(c, d) - 1)

/** aとbの間にある座標のリストを返す（８方向のみで、aやbは含まない） */
export const interpolation2D = (a: Point, b: Point): Point[] => {
    const rangeX: integer[] = a.x < b.x ? interpolation(a.x, b.x) : interpolation(a.x, b.x).reverse()
    const rangeY: integer[] = a.y < b.y ? interpolation(a.y, b.y) : interpolation(a.y, b.y).reverse()
    return rangeX.map<Point>((_, i) => ({x: rangeX[i], y: rangeY[i]}))
}

/** Syntax sugar of a === b */
export const isSameInstance = <T>(a: T, b: T): boolean => Object.is(a, b)
