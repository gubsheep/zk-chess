import {EventEmitter} from 'events';

export default interface AbstractUIManager extends EventEmitter {
  destroy(): void;

  joinGame(): Promise<void>;
}
