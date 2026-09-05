package protocol

import (
	"github.com/pbx/security/pbx"
	"github.com/pbx/security/pbx/crypto"
	"google.golang.org/protobuf/encoding/protowire"
)

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

func EncodeEnvelope(env Envelope) ([]byte, error) {
	var buf []byte
	buf = protowire.AppendTag(buf, 1, protowire.VarintType)
	buf = protowire.AppendVarint(buf, uint64(env.Version))
	buf = protowire.AppendTag(buf, 2, protowire.BytesType)
	buf = protowire.AppendString(buf, env.KeyID)
	buf = protowire.AppendTag(buf, 3, protowire.VarintType)
	buf = protowire.AppendVarint(buf, uint64(env.TimestampMs))
	buf = protowire.AppendTag(buf, 4, protowire.BytesType)
	buf = protowire.AppendString(buf, env.RequestID)
	buf = protowire.AppendTag(buf, 5, protowire.BytesType)
	buf = protowire.AppendBytes(buf, env.Nonce)
	buf = protowire.AppendTag(buf, 6, protowire.BytesType)
	buf = protowire.AppendBytes(buf, env.WrappedDEK)
	buf = protowire.AppendTag(buf, 7, protowire.BytesType)
	buf = protowire.AppendBytes(buf, env.Ciphertext)
	buf = protowire.AppendTag(buf, 8, protowire.BytesType)
	buf = protowire.AppendBytes(buf, env.MAC)
	return buf, nil
}

func DecodeEnvelope(data []byte) (Envelope, error) {
	var env Envelope
	for len(data) > 0 {
		num, typ, n := protowire.ConsumeTag(data)
		if n < 0 {
			return env, pbx.NewError(pbx.InvalidProtobuf)
		}
		data = data[n:]
		switch num {
		case 1:
			v, n := protowire.ConsumeVarint(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.Version = uint32(v)
			data = data[n:]
		case 2:
			v, n := protowire.ConsumeString(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.KeyID = v
			data = data[n:]
		case 3:
			v, n := protowire.ConsumeVarint(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.TimestampMs = int64(v)
			data = data[n:]
		case 4:
			v, n := protowire.ConsumeString(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.RequestID = v
			data = data[n:]
		case 5:
			v, n := protowire.ConsumeBytes(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.Nonce = append([]byte(nil), v...)
			data = data[n:]
		case 6:
			v, n := protowire.ConsumeBytes(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.WrappedDEK = append([]byte(nil), v...)
			data = data[n:]
		case 7:
			v, n := protowire.ConsumeBytes(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.Ciphertext = append([]byte(nil), v...)
			data = data[n:]
		case 8:
			v, n := protowire.ConsumeBytes(data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			env.MAC = append([]byte(nil), v...)
			data = data[n:]
		default:
			n = protowire.ConsumeFieldValue(num, typ, data)
			if n < 0 {
				return env, pbx.NewError(pbx.InvalidProtobuf)
			}
			data = data[n:]
		}
	}
	return env, nil
}

func ToCrypto(env Envelope) crypto.Envelope {
	return crypto.Envelope{
		Version:     env.Version,
		KeyID:       env.KeyID,
		TimestampMs: env.TimestampMs,
		RequestID:   env.RequestID,
		Nonce:       env.Nonce,
		WrappedDEK:  env.WrappedDEK,
		Ciphertext:  env.Ciphertext,
		MAC:         env.MAC,
	}
}

func FromCrypto(env crypto.Envelope) Envelope {
	return Envelope{
		Version:     env.Version,
		KeyID:       env.KeyID,
		TimestampMs: env.TimestampMs,
		RequestID:   env.RequestID,
		Nonce:       env.Nonce,
		WrappedDEK:  env.WrappedDEK,
		Ciphertext:  env.Ciphertext,
		MAC:         env.MAC,
	}
}
