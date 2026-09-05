use napi_derive::napi;
use napi::Error;
use aws_lc_rs::aead::{Aad, LessSafeKey, Nonce, UnboundKey, CHACHA20_POLY1305};
use aws_lc_rs::rand;
use base64::Engine;
use base64::engine::general_purpose;

#[napi]
pub fn hello_crypto() -> String {
    "crypto wrapper works".to_string()
}

#[napi]

pub fn random_bytes(length: u32) -> napi::Result<Vec<u8>> {
    let mut bytes = vec![0u8; length as usize];
    rand::fill(&mut bytes[..])
        .map_err(|_| Error::from_reason("Random generation failed"))?;
    Ok(bytes)
}


#[napi]
pub fn encrypt(plaintext: String, key: String) -> napi::Result<String> {
    let mut nonce_bytes: [u8; 12] = [0u8; 12];
    rand::fill(&mut nonce_bytes)
        .map_err(|_| Error::from_reason("Random generation failed"))?;

    let key_bytes: Vec<u8> = general_purpose::STANDARD
        .decode(&key)
        .map_err(|e| Error::from_reason(format!("Invalid key base64: {e}")))?;

    let unbound_key: UnboundKey = UnboundKey::new(&CHACHA20_POLY1305, &key_bytes)
        .map_err(|_| Error::from_reason("Invalid key length"))?;

    let key: LessSafeKey = LessSafeKey::new(unbound_key);
    let nonce: Nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut ciphertext: Vec<u8> = Vec::from(plaintext.as_bytes());
    key.seal_in_place_append_tag(nonce, Aad::empty(), &mut ciphertext)
        .map_err(|_| Error::from_reason("Encryption failed"))?;

    let ciphertext_base64: String = general_purpose::STANDARD.encode(ciphertext);
    let nonce_base64: String = general_purpose::STANDARD.encode(nonce_bytes);

    Ok(format!("{ciphertext_base64}::{nonce_base64}"))
}

#[napi]
pub fn decrypt(ciphertext: String, key: String) -> napi::Result<String> {
    let ciphertext_parts: Vec<&str> = ciphertext.split("::").collect();
    if ciphertext_parts.len() != 2 {
        return Err(Error::from_reason("Invalid ciphertext format. Expected payload::nonce"));
    }

    let mut ciphertext_bytes: Vec<u8> = general_purpose::STANDARD
        .decode(&ciphertext_parts[0])
        .map_err(|e| Error::from_reason(format!("Invalid ciphertext base64: {e}")))?;

    let nonce_bytes: Vec<u8> = general_purpose::STANDARD
        .decode(&ciphertext_parts[1])
        .map_err(|e| Error::from_reason(format!("Invalid nonce base64: {e}")))?;

    let nonce_array: [u8; 12] = nonce_bytes
        .try_into()
        .map_err(|_| Error::from_reason("Nonce must be 12 bytes long"))?;

    let key_bytes: Vec<u8> = general_purpose::STANDARD
        .decode(&key)
        .map_err(|e| Error::from_reason(format!("Invalid key base64: {e}")))?;

    let unbound_key: UnboundKey = UnboundKey::new(&CHACHA20_POLY1305, &key_bytes)
        .map_err(|_| Error::from_reason("Invalid key length"))?;

    let nonce: Nonce = Nonce::assume_unique_for_key(nonce_array);
    let key: LessSafeKey = LessSafeKey::new(unbound_key);

    let plaintext = key
        .open_in_place(nonce, Aad::empty(), &mut ciphertext_bytes)
        .map_err(|_| Error::from_reason("Decryption failed (bad tag or key)"))?;

    String::from_utf8(plaintext.to_vec())
        .map_err(|e| Error::from_reason(format!("Invalid UTF-8 plaintext: {e}")))
}