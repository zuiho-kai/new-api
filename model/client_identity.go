package model

import (
	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AttachClientLog(other *LogOther, identity *common.ClientIdentity) *LogOther {
	if other == nil {
		other = NewLogOther()
	}
	if identity != nil {
		other.SetPublic("client", identity)
	}
	return other
}

func clientFamilyFromContext(c *gin.Context) string {
	if identity := common.RequestClient(c); identity != nil {
		return identity.Family
	}
	return ""
}

func applyClientFamilyFilter(tx *gorm.DB, family []string) *gorm.DB {
	if len(family) == 0 || family[0] == "" {
		return tx
	}
	if family[0] == "unrecorded" {
		if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
			// Older parts synthesize this column from its default. Read-in-order
			// can mix sparse and lazy blocks on ClickHouse 25.8 for this filter.
			ctx := clickhouse.Context(tx.Statement.Context, clickhouse.WithSettings(clickhouse.Settings{"optimize_read_in_order": 0}))
			return tx.WithContext(ctx).Where("logs.client_family = ?", "")
		}
		return tx.Where("logs.client_family IS NULL OR logs.client_family = ?", "")
	}
	return tx.Where("logs.client_family = ?", family[0])
}
