package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"io"

	"github.com/pbx/security/pbx"
	"golang.org/x/crypto/hkdf"
)

const gcmNonceLen = 12
const gcmTagLen = 16
const dekLen = 32

func deriveKey(pbKey []byte, keyID, info string) ([]byte, error) {
	reader := hkdf.New(sha256.New, pbKey, []byte(keyID), []byte(info))
	key := make([]byte, dekLen)
	if _, err := io.ReadFull(reader, key); err != nil {
		return nil, pbx.NewError(pbx.KeyUnwrapFailed)
	}
	return key, nil
}

func encrypt(key, plaintext []byte) ([]byte, error) {
	nonce := make([]byte, gcmNonceLen)
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	out := gcm.Seal(nil, nonce, plaintext, nil)
	return append(nonce, out...), nil
}

func decrypt(key, blob []byte) ([]byte, error) {
	if len(blob) < gcmNonceLen+gcmTagLen {
		return nil, pbx.NewError(pbx.DecryptionFailed)
	}
	nonce := blob[:gcmNonceLen]
	ciphertext := blob[gcmNonceLen:]
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, pbx.NewError(pbx.DecryptionFailed)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, pbx.NewError(pbx.DecryptionFailed)
	}
	plain, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, pbx.NewError(pbx.DecryptionFailed)
	}
	return plain, nil
}

type Envelope struct {
	Version     uint32
	KeyID       string
	TimestampMs int64
	RequestID   string
	Nonce       []byte
	WrappedDEK  []byte
	Ciphertext  []byte
	MAC         []byte
}

func canonicalMACInput(env Envelope) []byte {
	var buf []byte
	writePart := func(part []byte) {
		lenBuf := make([]byte, 4)
		binary.BigEndian.PutUint32(lenBuf, uint32(len(part)))
		buf = append(buf, lenBuf...)
		buf = append(buf, part...)
	}
	writePart([]byte{byte(env.Version)})
	writePart([]byte(env.KeyID))
	ts := make([]byte, 8)
	binary.BigEndian.PutUint64(ts, uint64(env.TimestampMs))
	writePart(ts)
	writePart([]byte(env.RequestID))
	writePart(env.Nonce)
	writePart(env.WrappedDEK)
	writePart(env.Ciphertext)
	return buf
}

func ComputeMAC(key []byte, env Envelope) ([]byte, error) {
	macKey, err := deriveKey(key, env.KeyID, "pbx-mac")
	if err != nil {
		return nil, err
	}
	h := hmac.New(sha256.New, macKey)
	h.Write(canonicalMACInput(env))
	return h.Sum(nil), nil
}

func VerifyMAC(key []byte, env Envelope) error {
	expected, err := ComputeMAC(key, env)
	if err != nil {
		return err
	}
	if !hmac.Equal(expected, env.MAC) {
		return pbx.NewError(pbx.InvalidSignature)
	}
	return nil
}

func SealPayload(key []byte, keyID, requestID string, plaintext []byte, timestampMs int64) (Envelope, error) {
	dek := make([]byte, dekLen)
	if _, err := rand.Read(dek); err != nil {
		return Envelope{}, err
	}
	wrapKey, err := deriveKey(key, keyID, "pbx-wrap")
	if err != nil {
		return Envelope{}, err
	}
	wrapped, err := encrypt(wrapKey, dek)
	if err != nil {
		return Envelope{}, pbx.NewError(pbx.KeyUnwrapFailed)
	}
	ciphertext, err := encrypt(dek, plaintext)
	if err != nil {
		return Envelope{}, err
	}
	nonce := make([]byte, gcmNonceLen)
	if _, err := rand.Read(nonce); err != nil {
		return Envelope{}, err
	}
	env := Envelope{
		Version:     pbx.Version,
		KeyID:       keyID,
		TimestampMs: timestampMs,
		RequestID:   requestID,
		Nonce:       nonce,
		WrappedDEK:  wrapped,
		Ciphertext:  ciphertext,
	}
	mac, err := ComputeMAC(key, env)
	if err != nil {
		return Envelope{}, err
	}
	env.MAC = mac
	return env, nil
}

func OpenPayload(key []byte, env Envelope) ([]byte, error) {
	if env.Version != pbx.Version {
		return nil, pbx.NewError(pbx.InvalidEnvelope)
	}
	if env.KeyID == "" {
		return nil, pbx.NewError(pbx.InvalidAuthentication)
	}
	if err := VerifyMAC(key, env); err != nil {
		return nil, err
	}
	wrapKey, err := deriveKey(key, env.KeyID, "pbx-wrap")
	if err != nil {
		return nil, err
	}
	dek, err := decrypt(wrapKey, env.WrappedDEK)
	if err != nil {
		return nil, pbx.NewError(pbx.KeyUnwrapFailed)
	}
	return decrypt(dek, env.Ciphertext)
}
