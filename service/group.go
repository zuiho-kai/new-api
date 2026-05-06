package service

import (
	"strings"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
)

func GetUserUsableGroups(userGroup string) map[string]string {
	groupsCopy := setting.GetUserUsableGroupsCopy()

	// 在 special 规则之前先把所有自动分组 key 注入可用列表，
	// 这样管理员仍可用 "-:auto" / "-:vip_auto" 等 special 规则隐藏特定自动分组。
	for _, def := range setting.GetAutoGroupDefs() {
		if _, ok := groupsCopy[def.Key]; !ok {
			desc := def.DisplayName
			if desc == "" {
				desc = def.Key
			}
			groupsCopy[def.Key] = desc
		}
	}

	if userGroup != "" {
		specialSettings, b := ratio_setting.GetGroupRatioSetting().GroupSpecialUsableGroup.Get(userGroup)
		if b {
			// 处理特殊可用分组
			for specialGroup, desc := range specialSettings {
				if strings.HasPrefix(specialGroup, "-:") {
					// 移除分组
					groupToRemove := strings.TrimPrefix(specialGroup, "-:")
					delete(groupsCopy, groupToRemove)
				} else if strings.HasPrefix(specialGroup, "+:") {
					// 添加分组
					groupToAdd := strings.TrimPrefix(specialGroup, "+:")
					groupsCopy[groupToAdd] = desc
				} else {
					// 直接添加分组
					groupsCopy[specialGroup] = desc
				}
			}
		}
		// 如果userGroup不在UserUsableGroups中，返回UserUsableGroups + userGroup
		if _, ok := groupsCopy[userGroup]; !ok {
			groupsCopy[userGroup] = "用户分组"
		}
	}
	return groupsCopy
}

func GroupInUserUsableGroups(userGroup, groupName string) bool {
	_, ok := GetUserUsableGroups(userGroup)[groupName]
	return ok
}

// GetUserAutoGroup 根据用户分组与自动分组 key 取该自动分组下、对该用户可用的成员子集。
//
// autoGroupKey 必须是已配置的某个自动分组 key（例如内置的 "auto" 或自定义的 "vip_auto"）。
// 返回的列表保留 setting 中的优先级顺序。
func GetUserAutoGroup(userGroup, autoGroupKey string) []string {
	usable := GetUserUsableGroups(userGroup)
	members := setting.GetAutoGroupMembers(autoGroupKey)
	result := make([]string, 0, len(members))
	for _, m := range members {
		if _, ok := usable[m]; ok {
			result = append(result, m)
		}
	}
	return result
}

// GetUserGroupRatio 获取用户使用某个分组的倍率
// userGroup 用户分组
// group 需要获取倍率的分组
func GetUserGroupRatio(userGroup, group string) float64 {
	ratio, ok := ratio_setting.GetGroupGroupRatio(userGroup, group)
	if ok {
		return ratio
	}
	return ratio_setting.GetGroupRatio(group)
}
