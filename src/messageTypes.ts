import { Point } from "./library/shogi/util"

export type Message = MoveMessage | PlaceMessage

export type MoveMessage = {
    type: "move"
    from: Point
    to: Point
    doPromote: boolean
}

export type PlaceMessage = {
    type: "place"
    pos: Point
    handIndex: integer
}
