package validation

import (
	"strings"

	"github.com/pbx/security/pbx"
)

func normalizePath(path string) string {
	path = strings.SplitN(path, "?", 2)[0]
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return strings.TrimRight(path, "/")
}

func matchPattern(pattern, path string) bool {
	pattern = normalizePath(pattern)
	path = normalizePath(path)
	if path == "" {
		path = "/"
	}
	if strings.HasSuffix(pattern, "/*") {
		prefix := strings.TrimSuffix(pattern, "/*")
		return path == prefix || strings.HasPrefix(path, prefix+"/")
	}
	return pattern == path
}

func IsPublicRoute(path string, routes pbx.RouteConfig) bool {
	for _, pattern := range routes.Public {
		if matchPattern(pattern, path) {
			return true
		}
	}
	return false
}

func IsProtectedRoute(path string, routes pbx.RouteConfig, protectedMode bool) bool {
	if IsPublicRoute(path, routes) {
		return false
	}
	if len(routes.Protected) > 0 {
		for _, pattern := range routes.Protected {
			if matchPattern(pattern, path) {
				return true
			}
		}
		return false
	}
	return protectedMode
}
