import {ml_kem768_x25519 as xwing} from '@noble/post-quantum/hybrid.js';
export interface KeyPair {
  secretKey: Uint8Array<ArrayBufferLike>,
  publicKey: Uint8Array<ArrayBufferLike>
}
export abstract class CryptoService {

   static generateNewKeyPair() : KeyPair {
    return xwing.keygen();
  }
}
