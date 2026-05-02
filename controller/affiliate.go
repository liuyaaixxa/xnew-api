package controller

import (
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
)

// InviteTemplates holds the parsed invite page templates (set from main.go).
var InviteTemplates *template.Template

// SetInviteTemplates is called at startup to register parsed templates.
func SetInviteTemplates(t *template.Template) {
	InviteTemplates = t
}

// InvitePageData is injected into invite page templates.
type InvitePageData struct {
	InviterName    string
	InviterInitial string
	AffCode        string
	InviteLink     string
	InviteLinkJSON template.JS
	RegisterURL    string
	I18n           map[string]string
	I18nHTML       map[string]template.HTML
}

// inviteI18n returns translated strings for the invite pages based on Accept-Language.
func inviteI18n(c *gin.Context) (map[string]string, map[string]template.HTML) {
	lang := "zh"
	al := c.GetHeader("Accept-Language")
	if al != "" {
		al = strings.ToLower(al)
		if strings.HasPrefix(al, "en") {
			lang = "en"
		}
	}
	// Also support ?lang= query param override
	if ql := c.Query("lang"); ql != "" {
		lang = ql
	}

	if lang == "en" {
		return inviteI18nEnText, inviteI18nEnHTML
	}
	return inviteI18nZhText, inviteI18nZhHTML
}

// ── Chinese (zh) translations ──
var inviteI18nZhText = map[string]string{
	"badge":              "🎯 推广邀请",
	"invites_you":        "邀请您加入",
	"benefit1_title":     "注册即享免费额度",
	"benefit1_sub":       "零成本体验全部AI能力",
	"benefit2_title":     "好友充值你赚30%",
	"benefit2_sub":       "终身佣金，被动收入",
	"benefit3_title":     "40+ 顶级大模型",
	"benefit3_sub":       "GPT、Claude、Gemini 一站搞定",
	"cta_button":         "立即注册 · 免费开始",
	"login_link":         "已有账号？直接登录 →",
	"qr_title":           "📱 扫一扫，手机上打开",
	"share_hint":         "长按保存图片，分享给好友",
	"page_title":         "Tenu.AI — 你的AI副业，从今天开始",
	// v2 extras
	"v2_badge":           "💡 创意工具推荐",
	"v2_headline_1":      "让AI成为你的",
	"v2_headline_2":      "创作搭档",
	"v2_subtitle":        "40+顶级模型，灵感永不枯竭。",
	"v2_benefit1_title":  "一键生成 · 效率翻倍",
	"v2_benefit1_sub":    "文案、图片、代码，全能AI助手",
	"v2_benefit2_title":  "创意无限 · 自由创作",
	"v2_benefit2_sub":    "从草图到成品，AI加速每个环节",
	"v2_benefit3_title":  "安全可靠 · 数据加密",
	"v2_benefit3_sub":    "企业级安全保障，你的数据你做主",
	"v2_cta_button":      "免费开始创作",
	"v2_login_link":      "已有账号？登录 →",
	"v2_qr_title":        "📱 扫码在手机上打开",
	"v2_share_hint":      "保存图片分享给朋友",
	"v2_page_title":      "Tenu.AI — 发现你的AI创作搭档",
	// v3 extras
	"v3_badge":           "📊 数据说话",
	"v3_headline":        "用数据证明，AI让工作更高效",
	"v3_subtitle":        "2,000+开发者的选择 · 99.9% SLA · 50M+ 日请求",
	"v3_benefit1_title":  "统一API",
	"v3_benefit1_sub":    "一次接入40+模型，零代码切换",
	"v3_benefit2_title":  "按量付费",
	"v3_benefit2_sub":    "透明计费，只为实际用量买单",
	"v3_benefit3_title":  "企业级可靠",
	"v3_benefit3_sub":    "自动故障转移，零停机",
	"v3_cta_button":      "免费开始使用",
	"v3_login_link":      "已有账号？登录 →",
	"v3_qr_title":        "📱 扫码在手机上打开",
	"v3_share_hint":      "保存图片分享给朋友",
	"v3_page_title":      "Tenu.AI — 企业级AI API网关",
	"v3_trust_item1_val": "40+",
	"v3_trust_item1_lbl": "AI模型",
	"v3_trust_item2_val": "99.9%",
	"v3_trust_item2_lbl": "运行SLA",
	"v3_trust_item3_val": "2K+",
	"v3_trust_item3_lbl": "开发者",
	"v3_trust_item4_val": "50M+",
	"v3_trust_item4_lbl": "日请求量",
}

var inviteI18nZhHTML = map[string]template.HTML{
	"headline":     template.HTML(`你的<span class="highlight">AI副业</span>，<br>从今天开始`),
	"subtitle":     template.HTML(`40+ 顶级AI模型随时调用，每次好友充值你都能获得<strong style="color:#D97757">30% 佣金</strong>。用得越多，赚得越多。`),
	"urgency_text": template.HTML(`已帮助 <strong>10,000+</strong> 创作者开启AI副业之路`),
	// v2
	"v2_subtitle_html": template.HTML(`40+顶级模型，灵感永不枯竭。<br>你的好友<strong style="color:#D97757">{{.InviterName}}</strong>推荐你来体验。`),
	"v2_social_proof":  template.HTML(`已有 <strong style="color:#D97757">10,000+</strong> 创作者加入`),
	// v3
	"v3_subtitle_html": template.HTML(`2,000+开发者的选择 · 99.9% SLA · 50M+ 日请求<br>你的好友<strong style="color:#D97757">{{.InviterName}}</strong>推荐你来体验。`),
	"v3_testimonial1": template.HTML(`"切换到Tenu.AI将我们的AI成本降低了<span style="color:#D97757;font-weight:600;">60%</span>。"`),
	"v3_testimonial2": template.HTML(`"自动故障转移在OpenAI宕机时<span style="color:#D97757;font-weight:600;">拯救了我们</span>。"`),
}

// ── English (en) translations ──
var inviteI18nEnText = map[string]string{
	"badge":              "🎯 Exclusive Invitation",
	"invites_you":        "invites you to join",
	"benefit1_title":     "Free credits on signup",
	"benefit1_sub":       "Experience all AI capabilities at zero cost",
	"benefit2_title":     "Earn 30% on friend top-ups",
	"benefit2_sub":       "Lifetime commission, passive income",
	"benefit3_title":     "40+ top AI models",
	"benefit3_sub":       "GPT, Claude, Gemini — all in one place",
	"cta_button":         "Sign Up Free Now",
	"login_link":         "Already have an account? Log in →",
	"qr_title":           "📱 Scan to open on phone",
	"share_hint":         "Save image to share with friends",
	"page_title":         "Tenu.AI — Your AI Side Hustle Starts Today",
	// v2
	"v2_badge":           "💡 Creative Tool Recommendation",
	"v2_headline_1":      "Let AI Be Your",
	"v2_headline_2":      "Creative Partner",
	"v2_subtitle":        "40+ top models. Endless inspiration.",
	"v2_benefit1_title":  "One-Click · Double Efficiency",
	"v2_benefit1_sub":    "Copy, images, code — all-in-one AI assistant",
	"v2_benefit2_title":  "Unlimited Creativity",
	"v2_benefit2_sub":    "From sketch to finished product, AI accelerates every step",
	"v2_benefit3_title":  "Secure & Encrypted",
	"v2_benefit3_sub":    "Enterprise-grade security, your data stays yours",
	"v2_cta_button":      "Start Creating Free",
	"v2_login_link":      "Already have an account? Log in →",
	"v2_qr_title":        "📱 Scan QR to open on phone",
	"v2_share_hint":      "Save image to share with friends",
	"v2_page_title":      "Tenu.AI — Discover Your AI Creative Partner",
	// v3
	"v3_badge":           "📊 Data Speaks",
	"v3_headline":        "AI Makes Work More Efficient — Proven by Data",
	"v3_subtitle":        "2,000+ Developers · 99.9% SLA · 50M+ Daily Requests",
	"v3_benefit1_title":  "Unified API",
	"v3_benefit1_sub":    "Connect 40+ models with one integration",
	"v3_benefit2_title":  "Pay-as-you-go",
	"v3_benefit2_sub":    "Transparent billing, pay only for what you use",
	"v3_benefit3_title":  "Enterprise Reliability",
	"v3_benefit3_sub":    "Automatic failover, zero downtime",
	"v3_cta_button":      "Get Started Free",
	"v3_login_link":      "Already have an account? Log in →",
	"v3_qr_title":        "📱 Scan QR to open on phone",
	"v3_share_hint":      "Save image to share with friends",
	"v3_page_title":      "Tenu.AI — Enterprise AI API Gateway",
	"v3_trust_item1_val": "40+",
	"v3_trust_item1_lbl": "AI Models",
	"v3_trust_item2_val": "99.9%",
	"v3_trust_item2_lbl": "Uptime SLA",
	"v3_trust_item3_val": "2K+",
	"v3_trust_item3_lbl": "Developers",
	"v3_trust_item4_val": "50M+",
	"v3_trust_item4_lbl": "Daily Requests",
}

var inviteI18nEnHTML = map[string]template.HTML{
	"headline":     template.HTML(`Start Your <span class="highlight">AI Side Hustle</span><br>Today`),
	"subtitle":     template.HTML(`Access 40+ top AI models anytime. Earn <strong style="color:#D97757">30% commission</strong> every time your friends top up. The more they use, the more you earn.`),
	"urgency_text": template.HTML(`Already helped <strong>10,000+</strong> creators start their AI journey`),
	// v2
	"v2_subtitle_html": template.HTML(`40+ top models. Endless inspiration.<br>Your friend <strong style="color:#D97757">{{.InviterName}}</strong> recommends it.`),
	"v2_social_proof":  template.HTML(`<strong style="color:#D97757">10,000+</strong> creators have joined`),
	// v3
	"v3_subtitle_html": template.HTML(`2,000+ Developers · 99.9% SLA · 50M+ Daily Requests<br>Your friend <strong style="color:#D97757">{{.InviterName}}</strong> recommends it.`),
	"v3_testimonial1": template.HTML(`"Switching to Tenu.AI <span style="color:#D97757;font-weight:600;">cut our AI costs by 60%</span>."`),
	"v3_testimonial2": template.HTML(`"The auto-failover <span style="color:#D97757;font-weight:600;">saved us</span> during the OpenAI outage."`),
}

// ─── User endpoints ───

// ApplyAffiliate applies to join the affiliate program.
func ApplyAffiliate(c *gin.Context) {
	id := c.GetInt("id")
	u, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if u.AffCode != "" {
		c.JSON(200, gin.H{"success": false, "message": "已加入推广联盟"})
		return
	}

	u.AffCode = common.GetRandomString(6)
	if err := u.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{"aff_code": u.AffCode, "message": "成功加入推广联盟"})
}

// GetAffiliateStatus returns the user's affiliate stats and info.
func GetAffiliateStatus(c *gin.Context) {
	id := c.GetInt("id")
	stats := model.GetUserAffiliateStats(id)
	common.ApiSuccess(c, stats)
}

// GetAffiliateRecords returns paginated referral records.
func GetAffiliateRecords(c *gin.Context) {
	id := c.GetInt("id")
	pageInfo := common.GetPageQuery(c)
	records, total := model.GetUserAffiliateRecords(id, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(records)
	common.ApiSuccess(c, pageInfo)
}

// ApplyAffiliateSettlement applies for a weekly settlement.
func ApplyAffiliateSettlement(c *gin.Context) {
	id := c.GetInt("id")
	err := model.ApplySettlement(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"message": "结算申请已提交"})
}

// getDefaultAffCode returns the root user's aff_code as a fallback.
func getDefaultAffCode() string {
	root := model.GetRootUser()
	if root != nil && root.AffCode != "" {
		return root.AffCode
	}
	return ""
}

// setNoCacheHeaders prevents browser caching of the response.
func setNoCacheHeaders(c *gin.Context) {
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")
}

// GetInvitePage renders the invite landing page data.
func GetInvitePage(c *gin.Context) {
	setNoCacheHeaders(c)
	affCode := c.Query("aff")
	if affCode == "" {
		affCode = getDefaultAffCode()
	}
	if affCode == "" {
		c.JSON(200, gin.H{"success": false, "message": "缺少邀请码"})
		return
	}

	inviterId, err := model.GetUserIdByAffCode(affCode)
	if err != nil || inviterId == 0 {
		c.JSON(200, gin.H{"success": false, "message": "邀请码无效"})
		return
	}

	inviter, _ := model.GetUserById(inviterId, false)
	if inviter == nil {
		c.JSON(200, gin.H{"success": false, "message": "邀请者不存在"})
		return
	}

	// Set aff cookie for registration tracking (30 days)
	c.SetCookie("aff_code", affCode, 30*24*60*60, "/", "", false, true)

	common.ApiSuccess(c, gin.H{
		"inviter_name": inviter.DisplayName,
		"aff_code":     affCode,
	})
}

// GetVersionedInvitePage renders a specific invite page version (v1/v2/v3) as standalone HTML.
func GetVersionedInvitePage(c *gin.Context) {
	setNoCacheHeaders(c)
	version := c.Param("version")
	if version == "" {
		version = "v1"
	}

	affCode := c.Query("aff")
	if affCode == "" {
		affCode = getDefaultAffCode()
	}
	if affCode == "" {
		c.String(http.StatusOK, "<h1>缺少邀请码</h1>")
		return
	}

	inviterId, err := model.GetUserIdByAffCode(affCode)
	if err != nil || inviterId == 0 {
		c.String(http.StatusOK, "<h1>邀请码无效</h1>")
		return
	}

	inviter, _ := model.GetUserById(inviterId, false)
	inviterName := "您的好友"
	inviterInitial := "👤"
	if inviter != nil {
		inviterName = inviter.DisplayName
		if len(inviterName) > 0 {
			inviterInitial = strings.ToUpper(inviterName[:1])
		}
	}

	// Prefer the actual request host so invite links match the domain
	// the user is visiting (e.g. zpayz.cn), falling back to ServerAddress.
	scheme := "https"
	if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
		scheme = "http"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)
	if system_setting.ServerAddress != "" && c.Request.Host == "" {
		baseURL = system_setting.ServerAddress
	}

	inviteLink := fmt.Sprintf("%s/invite/%s?aff=%s", baseURL, version, affCode)
	registerURL := fmt.Sprintf("%s/register?aff=%s", baseURL, affCode)

	// Set aff cookie for registration tracking (30 days)
	c.SetCookie("aff_code", affCode, 30*24*60*60, "/", "", false, true)

	i18nText, i18nHTML := inviteI18n(c)
	data := InvitePageData{
		InviterName:    inviterName,
		InviterInitial: inviterInitial,
		AffCode:        affCode,
		InviteLink:     inviteLink,
		InviteLinkJSON: template.JS(fmt.Sprintf("`%s`", inviteLink)),
		RegisterURL:    registerURL,
		I18n:           i18nText,
		I18nHTML:       i18nHTML,
	}

	tmplName := "invite-" + version + ".html"
	if InviteTemplates == nil {
		c.String(http.StatusOK, "<h1>模板未加载</h1>")
		return
	}

	tmpl := InviteTemplates.Lookup(tmplName)
	if tmpl == nil {
		c.String(http.StatusOK, fmt.Sprintf("<h1>未知版本: %s</h1>", version))
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.Execute(c.Writer, data); err != nil {
		common.SysLog(fmt.Sprintf("invite template error: %v", err))
	}
}

// GetDefaultInvitePage redirects /invite to /invite/v1 (or user preference).
func GetDefaultInvitePage(c *gin.Context) {
	setNoCacheHeaders(c)
	affCode := c.Query("aff")
	if affCode == "" {
		affCode = getDefaultAffCode()
	}
	if affCode == "" {
		c.String(http.StatusOK, "<h1>缺少邀请码</h1>")
		return
	}
	c.Redirect(http.StatusFound, fmt.Sprintf("/invite/v1?aff=%s", affCode))
}

// GetToken618Page renders the 618 promotion activity page.
func GetToken618Page(c *gin.Context) {
	setNoCacheHeaders(c)
	affCode := c.Query("aff")
	if affCode == "" {
		affCode = getDefaultAffCode()
	}

	scheme := "https"
	if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
		scheme = "http"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)
	if system_setting.ServerAddress != "" && c.Request.Host == "" {
		baseURL = system_setting.ServerAddress
	}

	pageURL := fmt.Sprintf("%s/affiliate-618", baseURL)
	registerURL := fmt.Sprintf("%s/register", baseURL)
	if affCode != "" {
		registerURL = fmt.Sprintf("%s/register?aff=%s", baseURL, affCode)
		pageURL = fmt.Sprintf("%s/affiliate-618?aff=%s", baseURL, affCode)
		// Set aff cookie for registration tracking
		c.SetCookie("aff_code", affCode, 30*24*60*60, "/", "", false, true)
	}

	data := InvitePageData{
		RegisterURL:    registerURL,
		InviteLinkJSON: template.JS(fmt.Sprintf("`%s`", pageURL)),
	}

	tmpl := InviteTemplates.Lookup("token618.html")
	if tmpl == nil {
		c.String(http.StatusOK, "<h1>模板未加载</h1>")
		return
	}

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Cache-Control", "no-cache")
	if err := tmpl.Execute(c.Writer, data); err != nil {
		common.SysLog(fmt.Sprintf("token618 template error: %v", err))
	}
}

// GetAffiliateLink returns the user's affiliate links for all enabled promotions.
func GetAffiliateLink(c *gin.Context) {
	id := c.GetInt("id")
	u, err := model.GetUserById(id, false)
	if err != nil || u.AffCode == "" {
		common.ApiError(c, model.ErrAffiliateAlreadyApplied)
		return
	}

	scheme := "https"
	if c.Request.TLS == nil && c.GetHeader("X-Forwarded-Proto") != "https" {
		scheme = "http"
	}
	baseURL := fmt.Sprintf("%s://%s", scheme, c.Request.Host)
	if system_setting.ServerAddress != "" && c.Request.Host == "" {
		baseURL = system_setting.ServerAddress
	}

	promotions := model.GetEnabledPromotions()
	type PromotionInfo struct {
		Key         string `json:"key"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
		URL         string `json:"url"`
	}
	list := make([]PromotionInfo, 0, len(promotions))
	for _, p := range promotions {
		list = append(list, PromotionInfo{
			Key:         p.TemplateKey,
			Name:        p.Name,
			Description: p.Description,
			Color:       p.Color,
			URL:         fmt.Sprintf("%s%s?aff=%s", baseURL, p.RoutePath, u.AffCode),
		})
	}
	// Default URL from the first enabled promotion
	defaultURL := ""
	if len(list) > 0 {
		defaultURL = list[0].URL
	}

	common.ApiSuccess(c, gin.H{
		"aff_code":    u.AffCode,
		"default_url": defaultURL,
		"promotions":  list,
	})
}

// ─── Public promotion endpoint ───

// GetPublicPromotions returns enabled promotions (no auth required).
func GetPublicPromotions(c *gin.Context) {
	promotions := model.GetEnabledPromotions()
	common.ApiSuccess(c, promotions)
}

// ─── Admin promotion management ───

// AdminGetPromotions returns all affiliate promotions (admin).
func AdminGetPromotions(c *gin.Context) {
	promotions := model.GetAllPromotions()
	common.ApiSuccess(c, promotions)
}

// AdminUpdatePromotion updates a promotion's display fields and enabled status.
func AdminUpdatePromotion(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, fmt.Errorf("invalid id"))
		return
	}
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
		SortOrder   int    `json:"sort_order"`
		Enabled     bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.UpdatePromotion(id, req.Name, req.Description, req.Color, req.SortOrder, req.Enabled); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

// ─── Admin endpoints ───

// AdminGetAffiliateList lists all affiliates with stats.
func AdminGetAffiliateList(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	affiliates, total := model.GetAffiliateList(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(affiliates)
	common.ApiSuccess(c, pageInfo)
}

// AdminGetAffiliateSettlements lists settlements with optional status filter.
func AdminGetAffiliateSettlements(c *gin.Context) {
	status := c.Query("status")
	pageInfo := common.GetPageQuery(c)
	settlements, total := model.GetSettlementList(status, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(settlements)
	common.ApiSuccess(c, pageInfo)
}

// AdminApproveAffiliateSettlement approves a settlement and credits quota.
func AdminApproveAffiliateSettlement(c *gin.Context) {
	type approveReq struct {
		Id     int    `json:"id"`
		Remark string `json:"remark"`
	}
	var req approveReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if err := model.ApproveSettlement(req.Id, req.Remark); err != nil {
		common.ApiError(c, err)
		return
	}

	settlement := model.GetSettlementById(req.Id)
	if settlement != nil {
		model.RecordAffiliateLog(settlement.UserId, "佣金结算已通过")
	}

	common.ApiSuccess(c, gin.H{"message": "结算已批准"})
}

// AdminRejectAffiliateSettlement rejects a settlement.
func AdminRejectAffiliateSettlement(c *gin.Context) {
	type rejectReq struct {
		Id     int    `json:"id"`
		Remark string `json:"remark"`
	}
	var req rejectReq
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	if err := model.RejectSettlement(req.Id, req.Remark); err != nil {
		common.ApiError(c, err)
		return
	}

	settlement := model.GetSettlementById(req.Id)
	if settlement != nil {
		model.RecordAffiliateLog(settlement.UserId, "佣金结算已拒绝: "+req.Remark)
	}

	common.ApiSuccess(c, gin.H{"message": "结算已拒绝"})
}

// AdminGetAffiliateInvitedUsers returns users invited by a specific affiliate.
func AdminGetAffiliateInvitedUsers(c *gin.Context) {
	userId, err := strconv.Atoi(c.Query("user_id"))
	if err != nil || userId <= 0 {
		common.ApiError(c, errors.New("无效的用户ID"))
		return
	}
	pageInfo := common.GetPageQuery(c)
	users, total := model.GetInvitedUsers(userId, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(users)
	common.ApiSuccess(c, pageInfo)
}
