package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/pbx/security/pbx"
)

type contextKey string

const protectedKey contextKey = "pbx_protected"

func NetHTTP(core *Core) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, _ := io.ReadAll(r.Body)
			processed, err := core.ProcessRequest(r.URL.Path, raw)
			if err != nil {
				if pbxErr, ok := pbx.IsPbxError(err); ok {
					http.Error(w, `{"error":"`+pbx.PublicMessage(pbxErr.Code)+`"}`, pbx.PublicStatus(pbxErr.Code))
					return
				}
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}

			ctx := context.WithValue(r.Context(), protectedKey, processed.Protected)
			if processed.Protected || len(processed.Body) > 0 {
				r.Body = io.NopCloser(bytes.NewReader(processed.Body))
				r.ContentLength = int64(len(processed.Body))
			}

			rec := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r.WithContext(ctx))

			payload := rec.buf.Bytes()
			if len(payload) == 0 && rec.status < 400 {
				payload = []byte("{}")
			}
			encoded, err := core.ProcessResponse(r.URL.Path, payload, processed.Protected)
			if err != nil {
				if pbxErr, ok := pbx.IsPbxError(err); ok {
					http.Error(w, `{"error":"`+pbx.PublicMessage(pbxErr.Code)+`"}`, pbx.PublicStatus(pbxErr.Code))
					return
				}
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", encoded.ContentType)
			w.WriteHeader(rec.status)
			_, _ = w.Write(encoded.Body)
		})
	}
}

type responseRecorder struct {
	http.ResponseWriter
	buf    bytes.Buffer
	status int
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.buf.Write(b)
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.status = statusCode
}

func WriteJSON(w http.ResponseWriter, v any) {
	_ = json.NewEncoder(w).Encode(v)
}
