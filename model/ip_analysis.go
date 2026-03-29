package model

import (
	"github.com/QuantumNous/new-api/common"
)

type SharedIPResult struct {
	Ip        string   `json:"ip"`
	UserCount int      `json:"user_count"`
	Usernames string   `json:"usernames"`
	UserIds   string   `json:"user_ids"`
}

func GetSharedIPUsers(startIdx int, pageSize int) ([]*SharedIPResult, int64, error) {
	var results []*SharedIPResult
	var total int64

	// 先统计总数
	countSQL := `SELECT COUNT(*) FROM (
		SELECT ip FROM logs 
		WHERE ip != '' AND ip IS NOT NULL 
		GROUP BY ip 
		HAVING COUNT(DISTINCT user_id) > 1
	) sub`
	err := common.DB.Raw(countSQL).Scan(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// 查询分页数据
	dataSQL := `SELECT ip, 
		COUNT(DISTINCT user_id) as user_count,
		STRING_AGG(DISTINCT username, ',') as usernames,
		STRING_AGG(DISTINCT CAST(user_id AS TEXT), ',') as user_ids
		FROM logs 
		WHERE ip != '' AND ip IS NOT NULL 
		GROUP BY ip 
		HAVING COUNT(DISTINCT user_id) > 1
		ORDER BY user_count DESC
		LIMIT ? OFFSET ?`
	err = common.DB.Raw(dataSQL, pageSize, startIdx).Scan(&results).Error
	if err != nil {
		return nil, 0, err
	}

	return results, total, nil
}
