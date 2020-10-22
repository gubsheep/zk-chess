import { EventEmitter } from "events";

export default interface AbstractGameManager extends EventEmitter {
  destroy(): void;
}
