package middleware

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/pbx/security/pbx"
	"github.com/pbx/security/pbx/crypto"
	"github.com/pbx/security/pbx/protocol"
	"github.com/pbx/security/pbx/replay"
	"github.com/pbx/security/pbx/validation"
)

type ProcessedRequest struct {
	Body      []byte
	Protected bool
}

type ProcessedResponse struct {
	Body        []byte
	ContentType string
}

type Core struct {
	Config pbx.Config
	replay *replay.Store
}

func NewCore(cfg pbx.Config) *Core {
	return &Core{Config: cfg, replay: replay.NewStore(cfg.ReplayWindowSec)}
}

func (c *Core) RequiresProtection(path string) bool {
	return validation.IsProtectedRoute(path, c.Config.Routes, c.Config.ProtectedMode)
}

func (c *Core) ProcessRequest(path string, raw []byte) (ProcessedRequest, error) {
	if !c.RequiresProtection(path) {
		return ProcessedRequest{Body: raw, Protected: false}, nil
	}
	if len(raw) == 0 {
		return ProcessedRequest{}, pbx.NewError(pbx.InvalidEnvelope)
	}
	if len(raw) > c.Config.MaxBodySize {
		return ProcessedRequest{}, pbx.NewError(pbx.InvalidPayload)
	}
	env, err := protocol.DecodeEnvelope(raw)
	if err != nil {
		return ProcessedRequest{}, pbx.NewError(pbx.InvalidProtobuf)
	}
	if err := c.replay.Check(env.RequestID, env.TimestampMs); err != nil {
		return ProcessedRequest{}, err
	}
	body, err := crypto.OpenPayload(c.Config.Key, protocol.ToCrypto(env))
	if err != nil {
		return ProcessedRequest{}, err
	}
	if len(body) == 0 {
		return ProcessedRequest{}, pbx.NewError(pbx.InvalidPayload)
	}
	return ProcessedRequest{Body: body, Protected: true}, nil
}

func (c *Core) ProcessResponse(path string, payload []byte, wasProtected bool) (ProcessedResponse, error) {
	if !wasProtected {
		return ProcessedResponse{Body: payload, ContentType: "application/json"}, nil
	}
	env, err := crypto.SealPayload(c.Config.Key, c.Config.KeyID, uuid.NewString(), payload, time.Now().UnixMilli())
	if err != nil {
		return ProcessedResponse{}, err
	}
	encoded, err := protocol.EncodeEnvelope(protocol.FromCrypto(env))
	if err != nil {
		return ProcessedResponse{}, err
	}
	return ProcessedResponse{Body: encoded, ContentType: pbx.ContentType}, nil
}

func (c *Core) SealJSON(path string, data any, requestID string) ([]byte, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return nil, pbx.NewError(pbx.InvalidPayload)
	}
	env, err := crypto.SealPayload(c.Config.Key, c.Config.KeyID, requestID, payload, time.Now().UnixMilli())
	if err != nil {
		return nil, err
	}
	return protocol.EncodeEnvelope(protocol.FromCrypto(env))
}

func (c *Core) OpenJSON(raw []byte, out any) error {
	env, err := protocol.DecodeEnvelope(raw)
	if err != nil {
		return pbx.NewError(pbx.InvalidProtobuf)
	}
	if err := c.replay.Check(env.RequestID, env.TimestampMs); err != nil {
		return err
	}
	body, err := crypto.OpenPayload(c.Config.Key, protocol.ToCrypto(env))
	if err != nil {
		return err
	}
	if err := json.Unmarshal(body, out); err != nil {
		return pbx.NewError(pbx.InvalidPayload)
	}
	return nil
}
