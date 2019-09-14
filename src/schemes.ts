import { Schema, type } from "colyseus.js"
import { MapSchema } from "@colyseus/schema"

export class Player extends Schema {
	@type("string")
	color: string

	@type("string")
	id: string

	constructor(id: string, color: string) {
		super()
		this.id = id
		this.color = color
	}
}

export class MyState extends Schema {
	@type({ map: Player })
	players = new MapSchema<Player>()
}
