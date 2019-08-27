/**
     * オブジェクトをdeepCopyする
     *
     * 参考：https://stackoverflow.com/questions/28150967/typescript-cloning-object
     * @param obj オブジェクト
     */
export function deepCopy<T>(obj: T): T {
    var copy: any;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        copy.__proto__ = (<any>obj).__proto__
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = deepCopy(obj[i]);
        }
        copy.__proto__ = (<any>obj).__proto__
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if ((<any>obj).hasOwnProperty(attr)) copy[attr] = deepCopy(obj[attr]);
        }
        copy.__proto__ = (<any>obj).__proto__
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * 範囲を指定して配列を生成する
 *
 * 参考：https://qiita.com/kmdsbng/items/f43dce6794f660e382da
 * @param start 左端
 * @param end 右端
 */
export function range(start: integer, end: integer): Array<integer> {
    return Array.from({ length: (end - start + 1) }, (v, k) => k + start)
}

/** 小さい方の値を返す */
export function min(a: integer, b: integer) { return a <= b ? a : b }

/** 大きい方の値を返す */
export function max(a: integer, b: integer) { return a > b ? a : b }
