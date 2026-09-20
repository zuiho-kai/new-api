package model

import (
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
		return tx.Where("logs.client_family IS NULL OR logs.client_family = ?", "")
	}
	return tx.Where("logs.client_family = ?", family[0])
}
