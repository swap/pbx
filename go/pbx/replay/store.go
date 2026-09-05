package replay

import (
	"sync"
	"time"

	"github.com/pbx/security/pbx"
)

type Store struct {
	mu       sync.Mutex
	seen     map[string]int64
	windowMs int64
}

func NewStore(windowSec int) *Store {
	return &Store{
		seen:     make(map[string]int64),
		windowMs: int64(windowSec) * 1000,
	}
}

func (s *Store) Check(requestID string, timestampMs int64) error {
	now := time.Now().UnixMilli()
	if abs(now-timestampMs) > s.windowMs {
		return pbx.NewError(pbx.ExpiredRequest)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prune(now)
	if _, ok := s.seen[requestID]; ok {
		return pbx.NewError(pbx.ReplayDetected)
	}
	s.seen[requestID] = timestampMs
	return nil
}

func (s *Store) prune(now int64) {
	for id, ts := range s.seen {
		if now-ts > s.windowMs {
			delete(s.seen, id)
		}
	}
}

func abs(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}
