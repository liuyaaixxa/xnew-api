package common

import (
	"fmt"

	"github.com/wenlng/go-captcha-assets/resources/imagesv2"
	"github.com/wenlng/go-captcha-assets/resources/tiles"
	"github.com/wenlng/go-captcha/v2/slide"
)

var slideCaptcha slide.Captcha

func InitSlideCaptcha() {
	bgImages, err := imagesv2.GetImages()
	if err != nil {
		SysError(fmt.Sprintf("Failed to load slide captcha backgrounds: %v", err))
		return
	}

	tileGraphs, err := tiles.GetTiles()
	if err != nil {
		SysError(fmt.Sprintf("Failed to load slide captcha tiles: %v", err))
		return
	}

	graphs := make([]*slide.GraphImage, 0, len(tileGraphs))
	for _, t := range tileGraphs {
		graphs = append(graphs, &slide.GraphImage{
			OverlayImage: t.OverlayImage,
			ShadowImage:  t.ShadowImage,
			MaskImage:    t.MaskImage,
		})
	}

	builder := slide.NewBuilder()
	builder.SetResources(
		slide.WithBackgrounds(bgImages),
		slide.WithGraphImages(graphs),
	)
	slideCaptcha = builder.Make()
	SysLog("Slide captcha initialized")
}

type SlideCaptchaData struct {
	CaptchaId   string `json:"captcha_id"`
	Image       string `json:"image"`
	Thumb       string `json:"thumb"`
	ThumbX      int    `json:"thumb_x"`
	ThumbY      int    `json:"thumb_y"`
	ThumbWidth  int    `json:"thumb_width"`
	ThumbHeight int    `json:"thumb_height"`
}

func GenerateSlideCaptcha() (*SlideCaptchaData, error) {
	if slideCaptcha == nil {
		return nil, fmt.Errorf("slide captcha not initialized")
	}

	captData, err := slideCaptcha.Generate()
	if err != nil {
		return nil, err
	}

	blockData := captData.GetData()

	var masterBase64, tileBase64 string
	masterBase64, err = captData.GetMasterImage().ToBase64()
	if err != nil {
		return nil, err
	}
	tileBase64, err = captData.GetTileImage().ToBase64()
	if err != nil {
		return nil, err
	}

	id := GetUUID()

	// Store the target coordinates for verification
	coordStr := fmt.Sprintf("%d,%d", blockData.X, blockData.Y)
	if storeErr := captchaStore.Set(id, coordStr); storeErr != nil {
		return nil, storeErr
	}

	return &SlideCaptchaData{
		CaptchaId:   id,
		Image:       masterBase64,
		Thumb:       tileBase64,
		ThumbX:      blockData.DX,
		ThumbY:      blockData.DY,
		ThumbWidth:  blockData.Width,
		ThumbHeight: blockData.Height,
	}, nil
}

func VerifySlideCaptcha(id string, pointX, pointY int) (bool, string) {
	if id == "" {
		return false, "请完成人机校验"
	}

	stored, _ := captchaStore.Get(id, true)
	if stored == "" {
		return false, "验证码已过期，请刷新"
	}

	var targetX, targetY int
	_, err := fmt.Sscanf(stored, "%d,%d", &targetX, &targetY)
	if err != nil {
		return false, "验证码数据异常"
	}

	if !slide.Validate(pointX, pointY, targetX, targetY, 5) {
		return false, "滑块验证失败，请重试"
	}

	return true, ""
}

// VerifySlideCaptchaPreview validates the slide coordinates WITHOUT consuming
// the captcha entry, so the same captcha id can later be used by login/register
// to perform the authoritative one-shot verification. Used by /api/captcha/verify
// to give immediate feedback after the user releases the slider.
func VerifySlideCaptchaPreview(id string, pointX, pointY int) (bool, string) {
	if id == "" {
		return false, "请完成人机校验"
	}

	stored, _ := captchaStore.Get(id, false)
	if stored == "" {
		return false, "验证码已过期，请刷新"
	}

	var targetX, targetY int
	if _, err := fmt.Sscanf(stored, "%d,%d", &targetX, &targetY); err != nil {
		return false, "验证码数据异常"
	}

	if !slide.Validate(pointX, pointY, targetX, targetY, 5) {
		return false, "滑块验证失败，请重试"
	}

	return true, ""
}
