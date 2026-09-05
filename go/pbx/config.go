package pbx

import (
	"encoding/base64"
	"os"
	"strconv"
)

type RouteConfig struct {
	Protected []string
	Public    []string
}

type Config struct {
	Key         []byte
	KeyID           string
	ProtectedMode   bool
	ReplayWindowSec int
	MaxBodySize     int
	Routes          RouteConfig
}

func LoadConfigFromEnv() (Config, error) {
	keyB64 := os.Getenv("PBX_KEY")
	if keyB64 == "" {
		return Config{}, NewError(InvalidAuthentication)
	}
	key, err := base64.StdEncoding.DecodeString(keyB64)
	if err != nil || len(key) < 32 {
		return Config{}, NewError(InvalidAuthentication)
	}

	protected := os.Getenv("PBX_PROTECTED") == "true"
	replayWindow := 300
	if v := os.Getenv("PBX_REPLAY_WINDOW"); v != "" {
		replayWindow, _ = strconv.Atoi(v)
	}
	maxBody := 1_048_576
	if v := os.Getenv("PBX_MAX_BODY_SIZE"); v != "" {
		maxBody, _ = strconv.Atoi(v)
	}
	keyID := os.Getenv("PBX_KEY_ID")
	if keyID == "" {
		keyID = "default"
	}

	return Config{
		Key:           key,
		KeyID:           keyID,
		ProtectedMode:   protected,
		ReplayWindowSec: replayWindow,
		MaxBodySize:     maxBody,
		Routes: RouteConfig{
			Protected: []string{"/v2/*"},
			Public:    []string{"/health", "/version", "/public/*"},
		},
	}, nil
}
