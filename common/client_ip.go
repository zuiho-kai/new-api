package common

import (
	"fmt"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const (
	defaultTrustedProxies  = "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16,fc00::/7,fe80::/10"
	defaultRemoteIPHeaders = "CF-Connecting-IP,True-Client-IP,X-Forwarded-For,X-Real-IP"
)

func ConfigureClientIP(server *gin.Engine) {
	headers := parseCommaSeparatedEnv("TRUSTED_PROXY_HEADERS", defaultRemoteIPHeaders)
	if len(headers) > 0 {
		server.RemoteIPHeaders = headers
	}

	proxies := parseTrustedProxiesEnv()
	if err := server.SetTrustedProxies(proxies); err != nil {
		FatalLog(fmt.Sprintf("failed to configure trusted proxies: %s", err.Error()))
	}

	SysLog(fmt.Sprintf("trusted proxies configured: %s", strings.Join(proxies, ",")))
	SysLog(fmt.Sprintf("trusted proxy headers configured: %s", strings.Join(server.RemoteIPHeaders, ",")))
}

func parseTrustedProxiesEnv() []string {
	value, ok := os.LookupEnv("TRUSTED_PROXIES")
	if !ok {
		value = defaultTrustedProxies
	}
	value = strings.TrimSpace(value)
	if value == "" {
		value = defaultTrustedProxies
	}
	if strings.EqualFold(value, "none") {
		return nil
	}
	if strings.EqualFold(value, "all") {
		return []string{"0.0.0.0/0", "::/0"}
	}
	return splitCommaSeparated(value)
}

func parseCommaSeparatedEnv(env string, defaultValue string) []string {
	value, ok := os.LookupEnv(env)
	if !ok {
		value = defaultValue
	}
	return splitCommaSeparated(value)
}

func splitCommaSeparated(value string) []string {
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			items = append(items, item)
		}
	}
	return items
}
