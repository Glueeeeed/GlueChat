import { CryptoCore, mixedKeys } from './CryptoCore'
import {SessionState} from "./StorageService";

export abstract class RatchetService {

  static rotate(session: SessionState, inputSecret: Uint8Array, salt: Uint8Array, roomID: string): mixedKeys {
    const info = new TextEncoder().encode(roomID)

    const { nextChainKey, messageKey } = CryptoCore.mixKeys(inputSecret, salt, info)

    session.rootKey = nextChainKey
    session.sendCounter += 1

    return { nextChainKey, messageKey }
  }
}



