package common

import (
	"testing"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/types"
	"github.com/stretchr/testify/require"
)

func TestRelayInfoGetFinalRequestRelayFormatPrefersExplicitFinal(t *testing.T) {
	info := &RelayInfo{
		RelayFormat:             types.RelayFormatOpenAI,
		RequestConversionChain:  []types.RelayFormat{types.RelayFormatOpenAI, types.RelayFormatClaude},
		FinalRequestRelayFormat: types.RelayFormatOpenAIResponses,
	}

	require.Equal(t, types.RelayFormat(types.RelayFormatOpenAIResponses), info.GetFinalRequestRelayFormat())
}

func TestRelayInfoGetFinalRequestRelayFormatFallsBackToConversionChain(t *testing.T) {
	info := &RelayInfo{
		RelayFormat:            types.RelayFormatOpenAI,
		RequestConversionChain: []types.RelayFormat{types.RelayFormatOpenAI, types.RelayFormatClaude},
	}

	require.Equal(t, types.RelayFormat(types.RelayFormatClaude), info.GetFinalRequestRelayFormat())
}

func TestRelayInfoGetFinalRequestRelayFormatFallsBackToRelayFormat(t *testing.T) {
	info := &RelayInfo{
		RelayFormat: types.RelayFormatGemini,
	}

	require.Equal(t, types.RelayFormat(types.RelayFormatGemini), info.GetFinalRequestRelayFormat())
}

func TestRelayInfoGetFinalRequestRelayFormatNilReceiver(t *testing.T) {
	var info *RelayInfo
	require.Equal(t, types.RelayFormat(""), info.GetFinalRequestRelayFormat())
}

func TestIsEmptyStreamResponse(t *testing.T) {
	t.Run("流式_无chunk_usage为零_命中", func(t *testing.T) {
		info := &RelayInfo{IsStream: true, ReceivedResponseCount: 0}
		require.True(t, info.IsEmptyStreamResponse(&dto.Usage{}))
	})

	t.Run("流式_无chunk_usage为nil_命中", func(t *testing.T) {
		info := &RelayInfo{IsStream: true, ReceivedResponseCount: 0}
		require.True(t, info.IsEmptyStreamResponse(nil))
	})

	t.Run("非流式_永不命中", func(t *testing.T) {
		info := &RelayInfo{IsStream: false, ReceivedResponseCount: 0}
		require.False(t, info.IsEmptyStreamResponse(&dto.Usage{}))
		require.False(t, info.IsEmptyStreamResponse(nil))
	})

	t.Run("流式_收到过chunk_不命中", func(t *testing.T) {
		info := &RelayInfo{IsStream: true, ReceivedResponseCount: 1}
		require.False(t, info.IsEmptyStreamResponse(&dto.Usage{}))
	})

	t.Run("流式_无chunk_但usage有TotalTokens_不命中", func(t *testing.T) {
		info := &RelayInfo{IsStream: true, ReceivedResponseCount: 0}
		require.False(t, info.IsEmptyStreamResponse(&dto.Usage{TotalTokens: 5}))
	})

	t.Run("流式_无chunk_但usage有PromptTokens_不命中", func(t *testing.T) {
		info := &RelayInfo{IsStream: true, ReceivedResponseCount: 0}
		require.False(t, info.IsEmptyStreamResponse(&dto.Usage{PromptTokens: 10}))
	})

	t.Run("流式_无chunk_但usage有InputTokens_不命中_Responses路径", func(t *testing.T) {
		info := &RelayInfo{IsStream: true, ReceivedResponseCount: 0}
		require.False(t, info.IsEmptyStreamResponse(&dto.Usage{InputTokens: 3}))
	})

	t.Run("nil receiver不panic", func(t *testing.T) {
		var info *RelayInfo
		require.False(t, info.IsEmptyStreamResponse(&dto.Usage{}))
	})
}
