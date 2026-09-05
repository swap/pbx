package middleware

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pbx/security/pbx"
)

type ginBodyWriter struct {
	gin.ResponseWriter
	buf bytes.Buffer
}

func (w *ginBodyWriter) Write(b []byte) (int, error) {
	return w.buf.Write(b)
}

func Gin(core *Core) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, _ := io.ReadAll(c.Request.Body)
		processed, err := core.ProcessRequest(c.Request.URL.Path, raw)
		if err != nil {
			if pbxErr, ok := pbx.IsPbxError(err); ok {
				c.JSON(pbx.PublicStatus(pbxErr.Code), gin.H{"error": pbx.PublicMessage(pbxErr.Code)})
				c.Abort()
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			c.Abort()
			return
		}

		c.Request.Body = io.NopCloser(bytes.NewReader(processed.Body))
		c.Set("pbx_protected", processed.Protected)

		bw := &ginBodyWriter{ResponseWriter: c.Writer}
		c.Writer = bw
		c.Next()

		payload := bw.buf.Bytes()
		if len(payload) == 0 && c.Writer.Status() < 400 {
			payload = []byte("{}")
		}
		encoded, err := core.ProcessResponse(c.Request.URL.Path, payload, processed.Protected)
		if err != nil {
			if pbxErr, ok := pbx.IsPbxError(err); ok {
				c.JSON(pbx.PublicStatus(pbxErr.Code), gin.H{"error": pbx.PublicMessage(pbxErr.Code)})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
			return
		}

		c.Writer = bw.ResponseWriter
		c.Writer.Header().Set("Content-Type", encoded.ContentType)
		c.Writer.WriteHeader(bw.Status())
		_, _ = c.Writer.Write(encoded.Body)
	}
}
