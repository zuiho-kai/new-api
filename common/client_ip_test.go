package common

import (
	"reflect"
	"testing"
)

func TestParseTrustedProxiesEnvDefaults(t *testing.T) {
	t.Setenv("TRUSTED_PROXIES", "")

	got := parseTrustedProxiesEnv()
	want := []string{
		"127.0.0.1/32",
		"::1/128",
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"169.254.0.0/16",
		"fc00::/7",
		"fe80::/10",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("parseTrustedProxiesEnv() = %#v, want %#v", got, want)
	}
}

func TestParseTrustedProxiesEnvSpecialValues(t *testing.T) {
	t.Setenv("TRUSTED_PROXIES", "none")
	if got := parseTrustedProxiesEnv(); got != nil {
		t.Fatalf("parseTrustedProxiesEnv() = %#v, want nil", got)
	}

	t.Setenv("TRUSTED_PROXIES", "all")
	want := []string{"0.0.0.0/0", "::/0"}
	if got := parseTrustedProxiesEnv(); !reflect.DeepEqual(got, want) {
		t.Fatalf("parseTrustedProxiesEnv() = %#v, want %#v", got, want)
	}
}

func TestParseTrustedProxiesEnvList(t *testing.T) {
	t.Setenv("TRUSTED_PROXIES", " 127.0.0.1 , 10.0.0.0/8 ,, ")

	want := []string{"127.0.0.1", "10.0.0.0/8"}
	if got := parseTrustedProxiesEnv(); !reflect.DeepEqual(got, want) {
		t.Fatalf("parseTrustedProxiesEnv() = %#v, want %#v", got, want)
	}
}
