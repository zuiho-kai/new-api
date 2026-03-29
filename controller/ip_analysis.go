package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func GetSharedIPUsers(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	results, total, err := model.GetSharedIPUsers(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(results)
	common.ApiSuccess(c, pageInfo)
}
