package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

type ModelTag struct {
	Id          int    `json:"id"`
	Name        string `json:"name" gorm:"size:64;not null;uniqueIndex"`
	NameI18n    string `json:"name_i18n,omitempty" gorm:"size:128"`
	SortOrder   int    `json:"sort_order" gorm:"default:0"`
	CreatedTime int64  `json:"created_time" gorm:"bigint"`
	UpdatedTime int64  `json:"updated_time" gorm:"bigint"`
}

type ModelTagRelation struct {
	Id          int   `json:"id"`
	ModelId     int   `json:"model_id" gorm:"uniqueIndex:uk_model_tag"`
	TagId       int   `json:"tag_id" gorm:"uniqueIndex:uk_model_tag"`
	CreatedTime int64 `json:"created_time" gorm:"bigint"`
}

type ModelTagWithCount struct {
	ModelTag
	ModelCount int64 `json:"model_count"`
}

func GetAllTags() ([]ModelTagWithCount, error) {
	var tags []ModelTag
	if err := DB.Order("sort_order DESC, id ASC").Find(&tags).Error; err != nil {
		return nil, err
	}
	result := make([]ModelTagWithCount, len(tags))
	for i, t := range tags {
		result[i].ModelTag = t
		var count int64
		DB.Model(&ModelTagRelation{}).Where("tag_id = ?", t.Id).Count(&count)
		result[i].ModelCount = count
	}
	return result, nil
}

func GetTagById(id int) (*ModelTag, error) {
	var tag ModelTag
	if err := DB.First(&tag, id).Error; err != nil {
		return nil, err
	}
	return &tag, nil
}

func CreateTag(name, nameI18n string, sortOrder int) (*ModelTag, error) {
	if name == "" {
		return nil, errors.New("标签名称不能为空")
	}
	now := common.GetTimestamp()
	tag := &ModelTag{
		Name:        name,
		NameI18n:    nameI18n,
		SortOrder:   sortOrder,
		CreatedTime: now,
		UpdatedTime: now,
	}
	if err := DB.Create(tag).Error; err != nil {
		return nil, err
	}
	return tag, nil
}

func UpdateTag(id int, name, nameI18n string, sortOrder int) (*ModelTag, error) {
	if name == "" {
		return nil, errors.New("标签名称不能为空")
	}
	tag, err := GetTagById(id)
	if err != nil {
		return nil, err
	}
	tag.Name = name
	tag.NameI18n = nameI18n
	tag.SortOrder = sortOrder
	tag.UpdatedTime = common.GetTimestamp()
	if err := DB.Save(tag).Error; err != nil {
		return nil, err
	}
	return tag, nil
}

func DeleteTag(id int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tag_id = ?", id).Delete(&ModelTagRelation{}).Error; err != nil {
			return err
		}
		return tx.Delete(&ModelTag{}, id).Error
	})
}

func GetModelTags(modelId int) ([]ModelTag, error) {
	var tags []ModelTag
	err := DB.Joins("JOIN model_tag_relations ON model_tag_relations.tag_id = model_tags.id").
		Where("model_tag_relations.model_id = ?", modelId).
		Order("model_tags.sort_order DESC").
		Find(&tags).Error
	return tags, err
}

func SetModelTags(modelId int, tagIds []int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("model_id = ?", modelId).Delete(&ModelTagRelation{}).Error; err != nil {
			return err
		}
		now := common.GetTimestamp()
		for _, tagId := range tagIds {
			rel := ModelTagRelation{
				ModelId:     modelId,
				TagId:       tagId,
				CreatedTime: now,
			}
			if err := tx.Create(&rel).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
