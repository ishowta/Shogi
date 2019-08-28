import { Room, Client } from "colyseus"
import { Schema, type, MapSchema } from "@colyseus/schema"
import { Message } from "../messageTypes"

class Player extends Schema {
  @type("string")
  color: string

  constructor(color: string) {
    super()
    this.color = color
  }
}

class MyState extends Schema {
  @type("string")
  currentTurn: string = "black"

  @type({ map: Player })
  players = new MapSchema<Player>()
}

export class MyRoom extends Room {
  maxClients = 2
  state: MyState
  gameStartedFlag = false

  // tslint:disable-next-line: no-any
  onCreate(options: any) {
    this.setState(new MyState())
  }

  // tslint:disable-next-line: no-any
  onJoin(client: Client, options: any) {
    this.state.players[client.id] = new Player(this.clients.length === 1 ? "black" : "white")
    if (this.clients.length === 2) {
      this.gameStartedFlag = true
    }
  }

  // tslint:disable-next-line: no-any
  onMessage(client: Client, message: Message) {
    this.send(this.opponent(client), message)
  }

  onLeave(client: Client, consented: boolean) { }

  onDispose() { }

  opponent(player: Client): Client {
    return this.clients[this.clients[0].id === player.id ? 1 : 0]
  }
}
