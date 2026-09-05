package client

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/pbx/security/pbx"
	"github.com/pbx/security/pbx/middleware"
)

type Client struct {
	BaseURL string
	Core    *middleware.Core
	HTTP    *http.Client
}

func New(baseURL string, core *middleware.Core) *Client {
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Core:    core,
		HTTP:    http.DefaultClient,
	}
}

func (c *Client) Post(path string, data any) ([]byte, error) {
	return c.request(http.MethodPost, path, data)
}

func (c *Client) request(method, path string, data any) ([]byte, error) {
	url := c.BaseURL + path
	var body io.Reader
	contentType := "application/json"

	if data != nil {
		if c.Core.RequiresProtection(path) {
			sealed, err := c.Core.SealJSON(path, data, uuid.NewString())
			if err != nil {
				return nil, err
			}
			body = bytes.NewReader(sealed)
			contentType = pbx.ContentType
		} else {
			raw, err := json.Marshal(data)
			if err != nil {
				return nil, err
			}
			body = bytes.NewReader(raw)
		}
	}

	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", contentType)
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, pbx.NewError(pbx.InvalidAuthentication)
	}
	if c.Core.RequiresProtection(path) {
		var out json.RawMessage
		if err := c.Core.OpenJSON(raw, &out); err != nil {
			return nil, err
		}
		return out, nil
	}
	return raw, nil
}
