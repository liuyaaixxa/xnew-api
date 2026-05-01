package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func ListModelTags(c *gin.Context) {
	tags, err := model.GetAllTags()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if tags == nil {
		tags = []model.ModelTagWithCount{}
	}
	common.ApiSuccess(c, tags)
}

func CreateModelTag(c *gin.Context) {
	var body struct {
		Name      string `json:"name"`
		NameI18n  string `json:"name_i18n"`
		SortOrder int    `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		common.ApiError(c, err)
		return
	}
	if body.Name == "" {
		common.ApiErrorMsg(c, "标签名称不能为空")
		return
	}
	tag, err := model.CreateTag(body.Name, body.NameI18n, body.SortOrder)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, tag)
}

func UpdateModelTag(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var body struct {
		Name      string `json:"name"`
		NameI18n  string `json:"name_i18n"`
		SortOrder int    `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		common.ApiError(c, err)
		return
	}
	if body.Name == "" {
		common.ApiErrorMsg(c, "标签名称不能为空")
		return
	}
	tag, err := model.UpdateTag(id, body.Name, body.NameI18n, body.SortOrder)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, tag)
}

func DeleteModelTag(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DeleteTag(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "标签已删除"})
}

func GetModelTagsHandler(c *gin.Context) {
	idStr := c.Param("id")
	modelId, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	tags, err := model.GetModelTags(modelId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if tags == nil {
		tags = []model.ModelTag{}
	}
	common.ApiSuccess(c, tags)
}

func SetModelTagsHandler(c *gin.Context) {
	idStr := c.Param("id")
	modelId, err := strconv.Atoi(idStr)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var body struct {
		TagIds []int `json:"tag_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		common.ApiError(c, err)
		return
	}
	if body.TagIds == nil {
		body.TagIds = []int{}
	}
	if err := model.SetModelTags(modelId, body.TagIds); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "标签已更新"})
}
