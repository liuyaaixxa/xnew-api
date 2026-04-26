package common

import (
	"image/color"
	"strings"
	"sync"
	"time"

	"github.com/mojocn/base64Captcha"
)

const (
	captchaTTL       = 5 * time.Minute
	captchaKeyPrefix = "captcha:"
	// Exclude confusing chars: 0/O, 1/I/l
	captchaSource = "23456789abcdefghjkmnpqrstuvwxyz"
)

// --- Store interface ---

type CaptchaStore interface {
	Set(id string, value string) error
	Get(id string, clear bool) (string, error)
	Verify(id, answer string, clear bool) bool
}

// --- Redis store ---

type redisCaptchaStore struct{}

func (s *redisCaptchaStore) Set(id string, value string) error {
	return RedisSet(captchaKeyPrefix+id, value, captchaTTL)
}

func (s *redisCaptchaStore) Get(id string, clear bool) (string, error) {
	key := captchaKeyPrefix + id
	val, err := RedisGet(key)
	if err != nil {
		return "", err
	}
	if clear {
		RedisDel(key)
	}
	return val, nil
}

func (s *redisCaptchaStore) Verify(id, answer string, clear bool) bool {
	stored, err := s.Get(id, clear)
	if err != nil || stored == "" {
		return false
	}
	return strings.EqualFold(stored, answer)
}

// --- Memory store (fallback when Redis is unavailable) ---

type memoryCaptchaEntry struct {
	value     string
	expiresAt time.Time
}

type memoryCaptchaStore struct {
	mu    sync.Mutex
	items map[string]memoryCaptchaEntry
}

func newMemoryCaptchaStore() *memoryCaptchaStore {
	s := &memoryCaptchaStore{items: make(map[string]memoryCaptchaEntry)}
	go s.cleanupLoop()
	return s
}

func (s *memoryCaptchaStore) Set(id string, value string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[id] = memoryCaptchaEntry{value: value, expiresAt: time.Now().Add(captchaTTL)}
	return nil
}

func (s *memoryCaptchaStore) Get(id string, clear bool) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.items[id]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(s.items, id)
		return "", nil
	}
	if clear {
		delete(s.items, id)
	}
	return entry.value, nil
}

func (s *memoryCaptchaStore) Verify(id, answer string, clear bool) bool {
	stored, _ := s.Get(id, clear)
	if stored == "" {
		return false
	}
	return strings.EqualFold(stored, answer)
}

func (s *memoryCaptchaStore) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for k, v := range s.items {
			if now.After(v.expiresAt) {
				delete(s.items, k)
			}
		}
		s.mu.Unlock()
	}
}

// --- Factory + public API ---

var captchaStore CaptchaStore

func InitCaptchaStore() {
	if RedisEnabled {
		captchaStore = &redisCaptchaStore{}
		SysLog("Captcha store: Redis")
	} else {
		captchaStore = newMemoryCaptchaStore()
		SysLog("WARNING: Captcha store using in-memory — not suitable for multi-instance deployment")
	}
}

func GenerateCaptcha() (id string, base64Image string, err error) {
	driver := base64Captcha.NewDriverString(
		60, 200, 0, // height, width, noise
		base64Captcha.OptionShowHollowLine|base64Captcha.OptionShowSlimeLine,
		5,             // length
		captchaSource, // source chars
		&color.RGBA{R: 240, G: 240, B: 246, A: 255},
		nil,
		[]string{"wqy-microhei.ttc"},
	)

	captcha := base64Captcha.NewCaptcha(driver, base64Captcha.DefaultMemStore)
	id, body, answer, err := captcha.Generate()
	if err != nil {
		return "", "", err
	}

	// Store answer in our own store (not base64Captcha's default store)
	if storeErr := captchaStore.Set(id, answer); storeErr != nil {
		return "", "", storeErr
	}

	return id, body, nil
}

func VerifyCaptcha(id, value string) (valid bool, reason string) {
	if id == "" || value == "" {
		return false, "请完成人机校验"
	}
	stored, _ := captchaStore.Get(id, true) // always clear on attempt
	if stored == "" {
		return false, "验证码已过期，请刷新"
	}
	if !strings.EqualFold(stored, value) {
		return false, "验证码错误"
	}
	return true, ""
}
