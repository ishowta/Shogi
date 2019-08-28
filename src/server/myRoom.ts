import { Room, Client } from "colyseus"
import { Schema, type, MapSchema } from "@colyseus/schema"
import { Message } from "../messageTypes"
import * as Scheme from "./schemes"

export class MyRoom extends Room {
  maxClients = 2
  state: Scheme.MyState
  gameStartedFlag = false

  // tslint:disable-next-line: no-any
  onCreate(options: any) {
    this.setState(new Scheme.MyState())
  }

  // tslint:disable-next-line: no-any
  onJoin(client: Client, options: any) {
    this.state.players[client.id] = new Scheme.Player(client.id, this.clients.length % 2 === 0 ? "black" : "white")
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
