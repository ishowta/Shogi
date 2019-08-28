import { Room, Client } from "colyseus"

export class MyRoom extends Room {
  // tslint:disable-next-line: no-any
  onCreate(options: any) {}
  // tslint:disable-next-line: no-any
  onJoin(client: Client, options: any) {}
  // tslint:disable-next-line: no-any
  onMessage(client: Client, message: any) {}
  onLeave(client: Client, consented: boolean) {}
  onDispose() {}
}
