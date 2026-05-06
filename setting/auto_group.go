package setting

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

// BuiltinAutoGroupKey 内置自动分组 key，与历史 token.group="auto" 兼容，不可删除。
const BuiltinAutoGroupKey = "auto"

var autoGroupKeyPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// AutoGroupDef 一个自动分组的定义。
//
// 一个自动分组对外暴露一个 Key（写入 token.group / API 调用方使用），
// 内部维护一组按优先级排序的成员分组 Members。请求进入自动分组时，
// 系统按 Members 顺序尝试选可用渠道。
type AutoGroupDef struct {
	Key         string   `json:"key"`
	DisplayName string   `json:"display_name"`
	Description string   `json:"description,omitempty"`
	Members     []string `json:"members"`
}

var (
	autoGroupDefs = []AutoGroupDef{
		{Key: BuiltinAutoGroupKey, DisplayName: "自动", Members: []string{"default"}},
	}
	autoGroupDefsMu sync.RWMutex
)

// DefaultUseAutoGroup 控制创建令牌时是否默认使用内置自动分组。
var DefaultUseAutoGroup = false

// GetAutoGroupDefs 返回所有自动分组定义的深拷贝。
func GetAutoGroupDefs() []AutoGroupDef {
	autoGroupDefsMu.RLock()
	defer autoGroupDefsMu.RUnlock()
	out := make([]AutoGroupDef, len(autoGroupDefs))
	for i, def := range autoGroupDefs {
		members := make([]string, len(def.Members))
		copy(members, def.Members)
		out[i] = AutoGroupDef{
			Key:         def.Key,
			DisplayName: def.DisplayName,
			Description: def.Description,
			Members:     members,
		}
	}
	return out
}

// IsAutoGroupKey 判断给定 group 名是否是任一自动分组的 key。
func IsAutoGroupKey(key string) bool {
	if key == "" {
		return false
	}
	autoGroupDefsMu.RLock()
	defer autoGroupDefsMu.RUnlock()
	for _, def := range autoGroupDefs {
		if def.Key == key {
			return true
		}
	}
	return false
}

// GetAutoGroupMembers 按 key 取候选成员名单。key 不存在时返回 nil。
func GetAutoGroupMembers(key string) []string {
	autoGroupDefsMu.RLock()
	defer autoGroupDefsMu.RUnlock()
	for _, def := range autoGroupDefs {
		if def.Key == key {
			members := make([]string, len(def.Members))
			copy(members, def.Members)
			return members
		}
	}
	return nil
}

// GetAutoGroupDisplayName 按 key 取显示名，找不到返回 key 本身。
func GetAutoGroupDisplayName(key string) string {
	autoGroupDefsMu.RLock()
	defer autoGroupDefsMu.RUnlock()
	for _, def := range autoGroupDefs {
		if def.Key == key {
			if def.DisplayName != "" {
				return def.DisplayName
			}
			return def.Key
		}
	}
	return key
}

// AutoGroupKeys 返回所有自动分组 key 的列表。
func AutoGroupKeys() []string {
	autoGroupDefsMu.RLock()
	defer autoGroupDefsMu.RUnlock()
	keys := make([]string, len(autoGroupDefs))
	for i, def := range autoGroupDefs {
		keys[i] = def.Key
	}
	return keys
}

// ContainsAutoGroup 兼容历史调用：判断 group 是否在内置 auto 分组的成员名单里。
//
// Deprecated: 历史上调用方关心的是"该分组名是否参与某个自动选择列表"。
// 改造为多自动分组后，对应的语义应改为对特定 autoGroupKey 调用 GetAutoGroupMembers。
// 暂留此函数避免外部调用方编译失败。
func ContainsAutoGroup(group string) bool {
	autoGroupDefsMu.RLock()
	defer autoGroupDefsMu.RUnlock()
	for _, def := range autoGroupDefs {
		for _, m := range def.Members {
			if m == group {
				return true
			}
		}
	}
	return false
}

// GetAutoGroups 返回内置 auto 分组的成员名单。
//
// Deprecated: 仅作为旧调用兼容，新代码请使用 GetAutoGroupMembers / GetAutoGroupDefs。
func GetAutoGroups() []string {
	return GetAutoGroupMembers(BuiltinAutoGroupKey)
}

// UpdateAutoGroupsByJsonString 解析持久化的 AutoGroups option，兼容新旧两种格式。
//
// 旧格式（仅成员数组，对应单一 auto 自动分组）：
//
//	["default", "vip"]
//
// 新格式（命名自动分组数组）：
//
//	[{"key":"auto","display_name":"自动","members":["default","vip"]},
//	 {"key":"vip_auto","display_name":"VIP 自动","members":["vip","premium"]}]
//
// 解析过程：
//  1. 先尝试当作字符串数组解析（旧格式）→ 成功则包装成单一 builtin 自动分组
//  2. 否则当作 AutoGroupDef 数组解析
//  3. 校验每个 def 的 key 合法性、不重复
//  4. 若解析后缺失 builtin "auto" 项，自动补一个空 members 的占位项，保持向后兼容
func UpdateAutoGroupsByJsonString(jsonString string) error {
	defs, err := parseAutoGroupsJSON(jsonString)
	if err != nil {
		return err
	}
	autoGroupDefsMu.Lock()
	autoGroupDefs = defs
	autoGroupDefsMu.Unlock()
	return nil
}

// AutoGroups2JsonString 始终输出新格式 JSON。
func AutoGroups2JsonString() string {
	autoGroupDefsMu.RLock()
	defs := make([]AutoGroupDef, len(autoGroupDefs))
	for i, d := range autoGroupDefs {
		members := make([]string, len(d.Members))
		copy(members, d.Members)
		defs[i] = AutoGroupDef{
			Key:         d.Key,
			DisplayName: d.DisplayName,
			Description: d.Description,
			Members:     members,
		}
	}
	autoGroupDefsMu.RUnlock()

	jsonBytes, err := common.Marshal(defs)
	if err != nil {
		return "[]"
	}
	return string(jsonBytes)
}

func parseAutoGroupsJSON(jsonString string) ([]AutoGroupDef, error) {
	if jsonString == "" {
		return ensureBuiltinAutoGroup(nil), nil
	}

	// 先按数组元素的原始片段判定格式：每个元素以 '"' 开头视为旧字符串数组，
	// 以 '{' 开头视为新对象数组。空数组视为新格式。
	var rawElems []json.RawMessage
	if err := common.Unmarshal([]byte(jsonString), &rawElems); err != nil {
		return nil, fmt.Errorf("解析自动分组配置失败: %w", err)
	}

	if len(rawElems) > 0 && firstNonSpaceByte(rawElems[0]) == '"' {
		// 旧格式：纯字符串数组
		var legacyMembers []string
		if err := common.Unmarshal([]byte(jsonString), &legacyMembers); err != nil {
			return nil, fmt.Errorf("解析自动分组配置失败: %w", err)
		}
		def := AutoGroupDef{
			Key:         BuiltinAutoGroupKey,
			DisplayName: "自动",
			Members:     append([]string{}, legacyMembers...),
		}
		return []AutoGroupDef{def}, nil
	}

	// 新格式：AutoGroupDef 数组。
	var defs []AutoGroupDef
	if err := common.Unmarshal([]byte(jsonString), &defs); err != nil {
		return nil, fmt.Errorf("解析自动分组配置失败: %w", err)
	}

	seen := map[string]struct{}{}
	for i := range defs {
		def := &defs[i]
		if def.Key == "" {
			return nil, errors.New("自动分组 key 不能为空")
		}
		if !autoGroupKeyPattern.MatchString(def.Key) {
			return nil, fmt.Errorf("自动分组 key %q 非法（仅允许字母数字下划线短横线）", def.Key)
		}
		if _, dup := seen[def.Key]; dup {
			return nil, fmt.Errorf("自动分组 key %q 重复", def.Key)
		}
		seen[def.Key] = struct{}{}
		if def.Members == nil {
			def.Members = []string{}
		}
		if def.DisplayName == "" {
			def.DisplayName = def.Key
		}
	}

	return ensureBuiltinAutoGroup(defs), nil
}

// firstNonSpaceByte 返回 raw 中第一个非空白字符；若全为空白返回 0。
func firstNonSpaceByte(raw json.RawMessage) byte {
	trimmed := bytes.TrimLeft(raw, " \t\r\n")
	if len(trimmed) == 0 {
		return 0
	}
	return trimmed[0]
}

// ensureBuiltinAutoGroup 保证返回结果包含 builtin "auto" 项，缺失时自动补一个占位。
func ensureBuiltinAutoGroup(defs []AutoGroupDef) []AutoGroupDef {
	for _, def := range defs {
		if def.Key == BuiltinAutoGroupKey {
			return defs
		}
	}
	return append([]AutoGroupDef{
		{Key: BuiltinAutoGroupKey, DisplayName: "自动", Members: []string{}},
	}, defs...)
}
