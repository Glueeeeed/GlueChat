use napi_derive::napi;
use napi::Error;
use aws_lc_rs::aead::{Aad, LessSafeKey, Nonce, UnboundKey, CHACHA20_POLY1305};
use aws_lc_rs::rand;
use aws_lc_rs::kem::{ML_KEM_1024, DecapsulationKey, EncapsulationKey, EncapsulationKeyBytes, DecapsulationKeyBytes};

use base64::Engine;
use base64::engine::general_purpose;
use hex::encode as hex_encode;


struct KeyPair {
    pub private_key: String,
    pub public_key: String,
}


#[napi(object)]
pub struct OneTimeKey {
    pub account_name: String,
    pub secret_name: String,
    pub id: String,
    pub pub_key: String,
    pub private_key: String,
}


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

#[napi]
pub fn generate_one_time_keys(qty: i32, account_name: String, prefix: String ) -> napi::Result<Vec<OneTimeKey>> {
    let mut one_time_keys: Vec<OneTimeKey> = Vec::with_capacity(qty as usize);
    let mut i : i32 = 0;

    while i < qty {
        let mut key_id_bytes = [0u8; 4];
        rand::fill(&mut key_id_bytes)
            .map_err(|_| Error::from_reason("Random generation failed"))?;
        let key_id : String  = hex_encode(key_id_bytes);

        // decapsulation_key means the private key
        // encapsulation_key means the public key

        let decapsulation_key : DecapsulationKey = DecapsulationKey::generate(&ML_KEM_1024)
            .map_err(|_| Error::from_reason("Failed to generate pair keys"))?;
        let encapsulation_key : EncapsulationKey = decapsulation_key.encapsulation_key()
            .map_err(|_| Error::from_reason("Failed to generate private key"))?;

        let pub_key_bytes : EncapsulationKeyBytes = encapsulation_key.key_bytes()
            .map_err(|_| Error::from_reason("Failed convert public key to bytes"))?;

        let private_key_bytes : DecapsulationKeyBytes = decapsulation_key.key_bytes()
            .map_err(|_| Error::from_reason("Failed convert private key to bytes"))?;


        let private_key : String = general_purpose::STANDARD.encode(private_key_bytes.as_ref());
        let public_key : String = general_purpose::STANDARD.encode(pub_key_bytes.as_ref());



        let secret_name : String = format!("{}-otk-{}", prefix, key_id);
        let account_name : String = format!("gluechat_{}", account_name);

        one_time_keys.push(OneTimeKey {
            account_name,
            secret_name,
            id: key_id,
            pub_key: public_key,
            private_key,
        });

        i += 1;

    }

    Ok(one_time_keys)
}