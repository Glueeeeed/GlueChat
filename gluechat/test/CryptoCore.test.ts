import test from 'ava';
import {
  decrypt,
  encrypt,
  kemKeypair,
  KemLength,
  encapsulate,
  decapsulate,
  mlDsaKeypair,
  MlDsaLength,
  mlDsaSign,
  mlDsaVerify,
  randomBytes
} from '@glueeeed/gluechat-crypto';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// -------------------------------------------
// encrypt / decrypt round-trip
// -------------------------------------------

test('encrypt + decrypt should return the original plaintext', (t) => {
  const key = randomBytes(32);
  const plaintext = 'GlueChat';
  const plaintextBytes = encoder.encode(plaintext);

  const encrypted = encrypt(plaintextBytes, key);
  const decrypted = decrypt(encrypted, key);

  t.true(decoder.decode(decrypted) === plaintext);
});

test('encrypt should produce different ciphertext each time (nonce randomness)', (t) => {
  const key = randomBytes(32);
  const plaintext = encoder.encode('test data');

  const enc1 = encrypt(plaintext, key);
  const enc2 = encrypt(plaintext, key);

  t.not(enc1.length, 0);
  t.not(enc2.length, 0);
  // Ciphertexts should differ because of random nonce
  let different = false;
  for (let i = 0; i < enc1.length; i++) {
    if (enc1[i] !== enc2[i]) {
      different = true;
      break;
    }
  }
  t.true(different, 'Two encryptions of the same plaintext should produce different ciphertext');
});

test('decrypt with wrong key should throw', (t) => {
  const key = randomBytes(32);
  const wrongKey = randomBytes(32);
  const plaintext = encoder.encode('secret');

  const encrypted = encrypt(plaintext, key);

  t.throws(() => {
    decrypt(encrypted, wrongKey);
  });
});

test('encrypt + decrypt should handle empty content', (t) => {
  const key = randomBytes(32);
  const plaintext = encoder.encode('');

  const encrypted = encrypt(plaintext, key);
  const decrypted = decrypt(encrypted, key);

  t.true(decoder.decode(decrypted) === '');
});

test('encrypt + decrypt should handle large content', (t) => {
  const key = randomBytes(32);
  const largeText = 'A'.repeat(100_000);
  const plaintextBytes = encoder.encode(largeText);

  const encrypted = encrypt(plaintextBytes, key);
  const decrypted = decrypt(encrypted, key);

  t.true(decoder.decode(decrypted) === largeText);
});

test('encrypt + decrypt should handle unicode content', (t) => {
  const key = randomBytes(32);
  const unicodeText = '🔐🔑🛡️ 日本語テスト 한국어 테스트';
  const plaintextBytes = encoder.encode(unicodeText);

  const encrypted = encrypt(plaintextBytes, key);
  const decrypted = decrypt(encrypted, key);

  t.true(decoder.decode(decrypted) === unicodeText);
});

// -------------------------------------------
// randomBytes
// -------------------------------------------

test('randomBytes should return correct length', (t) => {
  const bytes = randomBytes(32);
  t.is(bytes.length, 32);
});

test('randomBytes should produce different output each call', (t) => {
  const b1 = randomBytes(32);
  const b2 = randomBytes(32);

  let different = false;
  for (let i = 0; i < 32; i++) {
    if (b1[i] !== b2[i]) {
      different = true;
      break;
    }
  }
  t.true(different, 'Two random byte arrays should differ');
});

// -------------------------------------------
// KEM key pair generation
// -------------------------------------------

test('kemKeypair should return a key pair with non-empty keys', (t) => {
  const kp = kemKeypair(KemLength.MlKem1024);
  t.truthy(kp.publicKey);
  t.truthy(kp.privateKey);
  t.not(kp.publicKey.length, 0);
  t.not(kp.privateKey.length, 0);
});

// -------------------------------------------
// encapsulate / decapsulate round-trip
// -------------------------------------------

test('encapsulate + decapsulate should produce the same shared secret', (t) => {
  const kp = kemKeypair(KemLength.MlKem1024);

  const { ciphertext, sharedSecret } = encapsulate(KemLength.MlKem1024, kp.publicKey);
  const decapsulatedSecret = decapsulate(KemLength.MlKem1024, kp.privateKey, ciphertext);

  t.is(sharedSecret.length, decapsulatedSecret.length);
  for (let i = 0; i < sharedSecret.length; i++) {
    t.is(sharedSecret[i], decapsulatedSecret[i], `Byte ${i} should match`);
  }
});

test('decapsulate with wrong private key should produce different shared secret', (t) => {
  const kp1 = kemKeypair(KemLength.MlKem1024);
  const kp2 = kemKeypair(KemLength.MlKem1024);

  const { ciphertext, sharedSecret } = encapsulate(KemLength.MlKem1024, kp1.publicKey);
  const wrongDecapsulated = decapsulate(KemLength.MlKem1024, kp2.privateKey, ciphertext);

  let different = false;
  for (let i = 0; i < sharedSecret.length; i++) {
    if (sharedSecret[i] !== wrongDecapsulated[i]) {
      different = true;
      break;
    }
  }
  t.true(different, 'Decapsulating with the wrong key should produce a different shared secret');
});

// -------------------------------------------
// DSA sign / verify
// -------------------------------------------

test('mlDsaSign + mlDsaVerify should return true for valid signature', (t) => {
  const kp = mlDsaKeypair(MlDsaLength.MlDsa87);
  const message = encoder.encode('Message to sign');

  const signature = mlDsaSign(MlDsaLength.MlDsa87, kp.privateKey, message);
  const isValid = mlDsaVerify(MlDsaLength.MlDsa87, kp.publicKey, message, signature);

  t.true(isValid);
});

test('mlDsaVerify should return false for tampered message', (t) => {
  const kp = mlDsaKeypair(MlDsaLength.MlDsa87);
  const message = encoder.encode('Original message');
  const tamperedMessage = encoder.encode('Changed message');

  const signature = mlDsaSign(MlDsaLength.MlDsa87, kp.privateKey, message);
  const isValid = mlDsaVerify(MlDsaLength.MlDsa87, kp.publicKey, tamperedMessage, signature);

  t.false(isValid);
});

test('mlDsaVerify should return false for wrong public key', (t) => {
  const kp1 = mlDsaKeypair(MlDsaLength.MlDsa87);
  const kp2 = mlDsaKeypair(MlDsaLength.MlDsa87);
  const message = encoder.encode('Test message');

  const signature = mlDsaSign(MlDsaLength.MlDsa87, kp1.privateKey, message);
  const isValid = mlDsaVerify(MlDsaLength.MlDsa87, kp2.publicKey, message, signature);

  t.false(isValid);
});

test('mlDsaKeypair should return non-empty keys', (t) => {
  const kp = mlDsaKeypair(MlDsaLength.MlDsa87);
  t.truthy(kp.publicKey);
  t.truthy(kp.privateKey);
  t.not(kp.publicKey.length, 0);
  t.not(kp.privateKey.length, 0);
});

// -------------------------------------------
// HKDF mixKeys (as used in CryptoCore)
// -------------------------------------------

function mixKeys(newKey: Uint8Array, oldKey: Uint8Array, message: Uint8Array): Uint8Array {
  return hkdf(sha256, newKey, oldKey, message, 32);
}

test('mixKeys should return a 32-byte key', (t) => {
  const newKey = randomBytes(32);
  const oldKey = randomBytes(32);
  const message = encoder.encode('context info');

  const mixed = mixKeys(newKey, oldKey, message);
  t.is(mixed.length, 32);
});

test('mixKeys should be deterministic for same inputs', (t) => {
  const newKey = randomBytes(32);
  const oldKey = randomBytes(32);
  const message = encoder.encode('context');

  const mixed1 = mixKeys(newKey, oldKey, message);
  const mixed2 = mixKeys(newKey, oldKey, message);

  for (let i = 0; i < 32; i++) {
    t.is(mixed1[i], mixed2[i], `Byte ${i} should match for deterministic mix`);
  }
});

test('mixKeys should produce different output for different inputs', (t) => {
  const newKey = randomBytes(32);
  const oldKey = randomBytes(32);
  const msg1 = encoder.encode('context A');
  const msg2 = encoder.encode('context B');

  const mixed1 = mixKeys(newKey, oldKey, msg1);
  const mixed2 = mixKeys(newKey, oldKey, msg2);

  let different = false;
  for (let i = 0; i < 32; i++) {
    if (mixed1[i] !== mixed2[i]) {
      different = true;
      break;
    }
  }
  t.true(different, 'Different context messages should produce different mixed keys');
});

// -------------------------------------------
// Full encryption round-trip (simulating ProtocolService flow)
// -------------------------------------------

test('full round-trip: encrypt with master key, decrypt with master key', (t) => {
  const masterKey = randomBytes(32);
  const content = 'Gluechat is the best.';
  const contentBytes = encoder.encode(content);

  const encryptedContent = encrypt(contentBytes, masterKey);

  const decryptedContent = decrypt(encryptedContent, masterKey);
  t.true(decoder.decode(decryptedContent) === content);
});

test('full round-trip: encapsulate root key, encrypt master key, decrypt both', (t) => {
  // Bob generates KEM key pair
  const bobKp = kemKeypair(KemLength.MlKem1024);

  // Alice encapsulates to Bob's public key
  const { ciphertext: capsule, sharedSecret: rootKey } = encapsulate(KemLength.MlKem1024, bobKp.publicKey);

  // Alice generates a master key and encrypts it with the root key
  const masterKey = randomBytes(32);
  const encryptedMasterKey = encrypt(masterKey, rootKey);

  // Alice encrypts the message content with the master key
  const content = 'Secret KEM message';
  const encryptedContent = encrypt(encoder.encode(content), masterKey);

  // --- Bob side ---
  // Bob decapsulates to get the root key
  const bobRootKey = decapsulate(KemLength.MlKem1024, bobKp.privateKey, capsule);

  // Bob decrypts the master key
  const decryptedMasterKey = decrypt(encryptedMasterKey, bobRootKey);

  // Bob decrypts the content
  const decryptedContent = decrypt(encryptedContent, decryptedMasterKey);
  t.true(decoder.decode(decryptedContent) === content);
});

// -------------------------------------------
// TextEncoder/TextDecoder round-trip (as used in HistoryManager & SecretManager)
// -------------------------------------------

test('TextEncoder encode + encrypt + decrypt + TextDecoder decode round-trip', (t) => {
  const key = randomBytes(32);
  const originalText = 'Hello from History message';

  const encoded = encoder.encode(originalText);
  const encrypted = encrypt(encoded, key);

  const decrypted = decrypt(encrypted, key);
  const decodedText = decoder.decode(decrypted);

  t.is(decodedText, originalText);
});

test('base64 serialization round-trip (as used in storage)', (t) => {
  const key = randomBytes(32);
  const originalText = 'Secret';

  const encoded = encoder.encode(originalText);
  const encrypted = encrypt(encoded, key);

  const encryptedBase64 = Buffer.from(encrypted).toString('base64');

  const encryptedBytes = Buffer.from(encryptedBase64, 'base64');
  const decrypted = decrypt(encryptedBytes, key);
  const decodedText = decoder.decode(decrypted);

  t.is(decodedText, originalText);
});
