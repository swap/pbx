use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use hkdf::Hkdf;
use hmac::{Hmac, Mac};
use rand::RngCore;
use sha2::Sha256;

use crate::errors::{PbxErrorCode, PBX_VERSION};

type HmacSha256 = Hmac<Sha256>;

const GCM_NONCE_LEN: usize = 12;
const DEK_LEN: usize = 32;

#[derive(Clone, Debug)]
pub struct Envelope {
    pub version: u32,
    pub key_id: String,
    pub timestamp_ms: i64,
    pub request_id: String,
    pub nonce: Vec<u8>,
    pub wrapped_dek: Vec<u8>,
    pub ciphertext: Vec<u8>,
    pub mac: Vec<u8>,
}

fn derive_key(key: &[u8], key_id: &str, info: &str) -> Result<[u8; DEK_LEN], PbxErrorCode> {
    let hk = Hkdf::<Sha256>::new(Some(key_id.as_bytes()), key);
    let mut okm = [0u8; DEK_LEN];
    hk.expand(info.as_bytes(), &mut okm)
        .map_err(|_| PbxErrorCode::KeyUnwrapFailed)?;
    Ok(okm)
}

fn encrypt(key: &[u8; DEK_LEN], plaintext: &[u8]) -> Result<Vec<u8>, PbxErrorCode> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| PbxErrorCode::DecryptionFailed)?;
    let mut nonce = [0u8; GCM_NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce);
    let encrypted = cipher
        .encrypt(Nonce::from_slice(&nonce), plaintext)
        .map_err(|_| PbxErrorCode::DecryptionFailed)?;
    let mut out = nonce.to_vec();
    out.extend(encrypted);
    Ok(out)
}

fn decrypt(key: &[u8; DEK_LEN], blob: &[u8]) -> Result<Vec<u8>, PbxErrorCode> {
    if blob.len() < GCM_NONCE_LEN {
        return Err(PbxErrorCode::DecryptionFailed);
    }
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| PbxErrorCode::DecryptionFailed)?;
    let (nonce, ciphertext) = blob.split_at(GCM_NONCE_LEN);
    cipher
        .decrypt(Nonce::from_slice(nonce), ciphertext)
        .map_err(|_| PbxErrorCode::DecryptionFailed)
}

fn canonical_mac_input(env: &Envelope) -> Vec<u8> {
    let mut out = Vec::new();
    let mut push = |part: &[u8]| {
        out.extend((part.len() as u32).to_be_bytes());
        out.extend(part);
    };
    push(&[env.version as u8]);
    push(env.key_id.as_bytes());
    push(&env.timestamp_ms.to_be_bytes());
    push(env.request_id.as_bytes());
    push(&env.nonce);
    push(&env.wrapped_dek);
    push(&env.ciphertext);
    out
}

pub fn compute_mac(key: &[u8], env: &Envelope) -> Result<Vec<u8>, PbxErrorCode> {
    let mac_key = derive_key(key, &env.key_id, "pbx-mac")?;
    let mut mac = HmacSha256::new_from_slice(&mac_key).map_err(|_| PbxErrorCode::InvalidSignature)?;
    mac.update(&canonical_mac_input(env));
    Ok(mac.finalize().into_bytes().to_vec())
}

pub fn verify_mac(key: &[u8], env: &Envelope) -> Result<(), PbxErrorCode> {
    let expected = compute_mac(key, env)?;
    if expected != env.mac {
        return Err(PbxErrorCode::InvalidSignature);
    }
    Ok(())
}

pub fn seal_payload(
    key: &[u8],
    key_id: &str,
    request_id: &str,
    plaintext: &[u8],
    timestamp_ms: i64,
) -> Result<Envelope, PbxErrorCode> {
    let mut dek = [0u8; DEK_LEN];
    rand::thread_rng().fill_bytes(&mut dek);
    let wrap_key = derive_key(key, key_id, "pbx-wrap")?;
    let wrapped_dek = encrypt(&wrap_key, &dek)?;
    let ciphertext = encrypt(&dek, plaintext)?;
    let mut nonce = vec![0u8; GCM_NONCE_LEN];
    rand::thread_rng().fill_bytes(&mut nonce);
    let mut env = Envelope {
        version: PBX_VERSION,
        key_id: key_id.into(),
        timestamp_ms,
        request_id: request_id.into(),
        nonce,
        wrapped_dek,
        ciphertext,
        mac: vec![],
    };
    env.mac = compute_mac(key, &env)?;
    Ok(env)
}

pub fn open_payload(key: &[u8], env: &Envelope) -> Result<Vec<u8>, PbxErrorCode> {
    if env.version != PBX_VERSION {
        return Err(PbxErrorCode::InvalidEnvelope);
    }
    if env.key_id.is_empty() {
        return Err(PbxErrorCode::InvalidAuthentication);
    }
    verify_mac(key, env)?;
    let wrap_key = derive_key(key, &env.key_id, "pbx-wrap")?;
    let dek_bytes = decrypt(&wrap_key, &env.wrapped_dek)?;
    let mut dek = [0u8; DEK_LEN];
    dek.copy_from_slice(&dek_bytes[..DEK_LEN]);
    decrypt(&dek, &env.ciphertext)
}
