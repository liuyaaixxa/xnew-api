package controller

import (
	"sort"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

func filterPricingByUsableGroups(pricing []model.Pricing, usableGroup map[string]string) []model.Pricing {
	if len(pricing) == 0 {
		return pricing
	}
	if len(usableGroup) == 0 {
		return []model.Pricing{}
	}

	filtered := make([]model.Pricing, 0, len(pricing))
	for _, item := range pricing {
		if common.StringsContains(item.EnableGroup, "all") {
			filtered = append(filtered, item)
			continue
		}
		for _, group := range item.EnableGroup {
			if _, ok := usableGroup[group]; ok {
				filtered = append(filtered, item)
				break
			}
		}
	}
	return filtered
}

func GetPricing(c *gin.Context) {
	pricing := model.GetPricing()
	userId, exists := c.Get("id")
	usableGroup := map[string]string{}
	groupRatio := map[string]float64{}
	for s, f := range ratio_setting.GetGroupRatioCopy() {
		groupRatio[s] = f
	}
	var group string
	if exists {
		user, err := model.GetUserCache(userId.(int))
		if err == nil {
			group = user.Group
			for g := range groupRatio {
				ratio, ok := ratio_setting.GetGroupGroupRatio(group, g)
				if ok {
					groupRatio[g] = ratio
				}
			}
		}
	}

	usableGroup = service.GetUserUsableGroups(group)
	pricing = filterPricingByUsableGroups(pricing, usableGroup)
	// check groupRatio contains usableGroup
	for group := range ratio_setting.GetGroupRatioCopy() {
		if _, ok := usableGroup[group]; !ok {
			delete(groupRatio, group)
		}
	}

	// Optional server-side filter & sort & pagination
	search := strings.TrimSpace(c.Query("search"))
	vendorFilter := strings.TrimSpace(c.Query("vendor"))
	tagFilter := strings.TrimSpace(c.Query("tag"))
	categoryFilter := strings.TrimSpace(c.Query("category"))
	sortBy := strings.TrimSpace(c.Query("sort"))
	pageStr := c.Query("p")
	pageSizeStr := c.Query("page_size")

	// Build vendor name map for search
	vendorNameMap := make(map[int]string)
	for _, v := range model.GetVendors() {
		vendorNameMap[v.ID] = v.Name
	}

	// Search filter
	if search != "" {
		searchLower := strings.ToLower(search)
		filtered := make([]model.Pricing, 0)
		for _, p := range pricing {
			if strings.Contains(strings.ToLower(p.ModelName), searchLower) ||
				strings.Contains(strings.ToLower(p.DisplayName), searchLower) ||
				strings.Contains(strings.ToLower(p.Description), searchLower) ||
				strings.Contains(strings.ToLower(p.Tags), searchLower) ||
				strings.Contains(strings.ToLower(vendorNameMap[p.VendorID]), searchLower) {
				filtered = append(filtered, p)
			}
		}
		pricing = filtered
	}

	// Vendor filter
	if vendorFilter != "" {
		filtered := make([]model.Pricing, 0)
		for _, p := range pricing {
			if strings.EqualFold(vendorNameMap[p.VendorID], vendorFilter) {
				filtered = append(filtered, p)
			}
		}
		pricing = filtered
	}

	// Tag filter
	if tagFilter != "" {
		filtered := make([]model.Pricing, 0)
		for _, p := range pricing {
			if strings.Contains(strings.ToLower(p.Tags), strings.ToLower(tagFilter)) {
				filtered = append(filtered, p)
			}
		}
		pricing = filtered
	}

	// Category (endpoint type) filter
	if categoryFilter != "" {
		catLower := strings.ToLower(categoryFilter)
		filtered := make([]model.Pricing, 0)
		for _, p := range pricing {
			for _, ep := range p.SupportedEndpointTypes {
				if strings.Contains(strings.ToLower(string(ep)), catLower) {
					filtered = append(filtered, p)
					break
				}
			}
		}
		pricing = filtered
	}

	// Sort
	switch sortBy {
	case "price-asc":
		sort.SliceStable(pricing, func(i, j int) bool {
			return pricing[i].ModelRatio < pricing[j].ModelRatio
		})
	case "price-desc":
		sort.SliceStable(pricing, func(i, j int) bool {
			return pricing[i].ModelRatio > pricing[j].ModelRatio
		})
	case "newest":
		sort.SliceStable(pricing, func(i, j int) bool {
			return pricing[i].SortOrder > pricing[j].SortOrder
		})
	case "popular":
		sort.SliceStable(pricing, func(i, j int) bool {
			return pricing[i].SortOrder > pricing[j].SortOrder
		})
	}

	// Pagination
	total := len(pricing)
	var page, pageSize int
	if pageStr != "" {
		page, _ = strconv.Atoi(pageStr)
	}
	if pageSizeStr != "" {
		pageSize, _ = strconv.Atoi(pageSizeStr)
	}
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 12
	}
	start := (page - 1) * pageSize
	if start < total {
		end := start + pageSize
		if end > total {
			end = total
		}
		pricing = pricing[start:end]
	} else if total > 0 {
		pricing = pricing[0:0]
	}

	c.JSON(200, gin.H{
		"success":            true,
		"data":               pricing,
		"vendors":            model.GetVendors(),
		"group_ratio":        groupRatio,
		"usable_group":       usableGroup,
		"supported_endpoint": model.GetSupportedEndpointMap(),
		"auto_groups":        service.GetUserAutoGroup(group),
		"pricing_version":    "a42d372ccf0b5dd13ecf71203521f9d2",
		"total":              total,
		"page":               page,
		"page_size":          pageSize,
	})
}

func ResetModelRatio(c *gin.Context) {
	defaultStr := ratio_setting.DefaultModelRatio2JSONString()
	err := model.UpdateOption("ModelRatio", defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	err = ratio_setting.UpdateModelRatioByJSONString(defaultStr)
	if err != nil {
		c.JSON(200, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(200, gin.H{
		"success": true,
		"message": "重置模型倍率成功",
	})
}
