package logger

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

const (
	loggerINFO  = "INFO"
	loggerWarn  = "WARN"
	loggerError = "ERR"
	loggerDebug = "DEBUG"
)

const maxLogCount = 1000000

var logCount int
var setupLogLock sync.Mutex
var setupLogWorking bool
var currentLogPath string
var currentLogPathMu sync.RWMutex
var currentLogFile *os.File

// zapLogger is the process-wide structured logger. It is safe for concurrent
// use and its underlying core is swapped atomically on log rotation.
var (
	zapLogger   *zap.Logger
	zapLoggerMu sync.RWMutex
)

// ServiceName tags every log entry with a `service` field so multiple
// services pushing to the same Loki instance can be filtered apart.
var ServiceName = "xnew-api"

func init() {
	if v := os.Getenv("SERVICE_NAME"); v != "" {
		ServiceName = v
	}
	// Bootstrap with a stdout-only logger so logs emitted before
	// SetupLogger runs (flag parsing, env init) are still structured.
	zapLogger = buildZapLogger(zapcore.AddSync(os.Stdout))
}

func GetCurrentLogPath() string {
	currentLogPathMu.RLock()
	defer currentLogPathMu.RUnlock()
	return currentLogPath
}

// buildZapLogger constructs a zap logger that writes JSON lines to the given
// sink. It's factored out so SetupLogger can rebuild the logger when log
// files rotate.
func buildZapLogger(sink zapcore.WriteSyncer) *zap.Logger {
	encoderCfg := zapcore.EncoderConfig{
		TimeKey:        "ts",
		LevelKey:       "level",
		MessageKey:     "msg",
		CallerKey:      "",
		StacktraceKey:  "",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.RFC3339TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}
	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderCfg),
		sink,
		zapcore.DebugLevel, // we filter via our own `loggerDebug` branch
	)
	return zap.New(core).With(zap.String("service", ServiceName))
}

// L returns the current process-wide structured logger. Use from new code that
// wants typed fields; legacy code can keep using SysLog/LogInfo/etc.
func L() *zap.Logger {
	zapLoggerMu.RLock()
	defer zapLoggerMu.RUnlock()
	return zapLogger
}

func SetupLogger() {
	defer func() {
		setupLogWorking = false
	}()
	if *common.LogDir != "" {
		ok := setupLogLock.TryLock()
		if !ok {
			log.Println("setup log is already working")
			return
		}
		defer func() {
			setupLogLock.Unlock()
		}()
		logPath := filepath.Join(*common.LogDir, fmt.Sprintf("oneapi-%s.log", time.Now().Format("20060102150405")))
		fd, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Fatal("failed to open log file")
		}
		currentLogPathMu.Lock()
		oldFile := currentLogFile
		currentLogPath = logPath
		currentLogFile = fd
		currentLogPathMu.Unlock()

		// Rebuild the zap logger to write to stdout + new file simultaneously.
		sink := zapcore.NewMultiWriteSyncer(
			zapcore.AddSync(os.Stdout),
			zapcore.AddSync(fd),
		)
		newLogger := buildZapLogger(sink)
		zapLoggerMu.Lock()
		zapLogger = newLogger
		zapLoggerMu.Unlock()

		// Keep gin's access log sinks aligned with the same writers so HTTP
		// access lines land in the same file. These are plain-text (not JSON)
		// because gin writes its own format; Loki's `| json` filter will
		// gracefully skip non-JSON lines.
		common.LogWriterMu.Lock()
		gin.DefaultWriter = newMultiWriter(os.Stdout, fd)
		gin.DefaultErrorWriter = newMultiWriter(os.Stderr, fd)
		if oldFile != nil {
			_ = oldFile.Close()
		}
		common.LogWriterMu.Unlock()
	}
}

// newMultiWriter mirrors io.MultiWriter but lives here to avoid importing
// io in call sites; keeps this file self-contained.
func newMultiWriter(writers ...*os.File) *multiFileWriter {
	return &multiFileWriter{writers: writers}
}

type multiFileWriter struct {
	writers []*os.File
}

func (m *multiFileWriter) Write(p []byte) (int, error) {
	var firstErr error
	for _, w := range m.writers {
		if _, err := w.Write(p); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return len(p), firstErr
}

func LogInfo(ctx context.Context, msg string) {
	logHelper(ctx, loggerINFO, msg)
}

func LogWarn(ctx context.Context, msg string) {
	logHelper(ctx, loggerWarn, msg)
}

func LogError(ctx context.Context, msg string) {
	logHelper(ctx, loggerError, msg)
}

func LogDebug(ctx context.Context, msg string, args ...any) {
	if common.DebugEnabled {
		if len(args) > 0 {
			msg = fmt.Sprintf(msg, args...)
		}
		logHelper(ctx, loggerDebug, msg)
	}
}

func logHelper(ctx context.Context, level string, msg string) {
	var requestID string
	if id := ctx.Value(common.RequestIdKey); id != nil {
		requestID = fmt.Sprint(id)
	} else {
		requestID = "SYSTEM"
	}

	logger := L().With(zap.String("request_id", requestID))
	switch level {
	case loggerINFO:
		logger.Info(msg)
	case loggerWarn:
		logger.Warn(msg)
	case loggerError:
		logger.Error(msg)
	case loggerDebug:
		logger.Debug(msg)
	default:
		logger.Info(msg)
	}

	logCount++ // we don't need accurate count, so no lock here
	if logCount > maxLogCount && !setupLogWorking {
		logCount = 0
		setupLogWorking = true
		gopool.Go(func() {
			SetupLogger()
		})
	}
}

func LogQuota(quota int) string {
	// 新逻辑：根据额度展示类型输出
	q := float64(quota)
	switch operation_setting.GetQuotaDisplayType() {
	case operation_setting.QuotaDisplayTypeCNY:
		usd := q / common.QuotaPerUnit
		cny := usd * operation_setting.USDExchangeRate
		return fmt.Sprintf("¥%.6f 额度", cny)
	case operation_setting.QuotaDisplayTypeCustom:
		usd := q / common.QuotaPerUnit
		rate := operation_setting.GetGeneralSetting().CustomCurrencyExchangeRate
		symbol := operation_setting.GetGeneralSetting().CustomCurrencySymbol
		if symbol == "" {
			symbol = "¤"
		}
		if rate <= 0 {
			rate = 1
		}
		v := usd * rate
		return fmt.Sprintf("%s%.6f 额度", symbol, v)
	case operation_setting.QuotaDisplayTypeTokens:
		return fmt.Sprintf("%d 点额度", quota)
	default: // USD
		return fmt.Sprintf("＄%.6f 额度", q/common.QuotaPerUnit)
	}
}

func FormatQuota(quota int) string {
	q := float64(quota)
	switch operation_setting.GetQuotaDisplayType() {
	case operation_setting.QuotaDisplayTypeCNY:
		usd := q / common.QuotaPerUnit
		cny := usd * operation_setting.USDExchangeRate
		return fmt.Sprintf("¥%.6f", cny)
	case operation_setting.QuotaDisplayTypeCustom:
		usd := q / common.QuotaPerUnit
		rate := operation_setting.GetGeneralSetting().CustomCurrencyExchangeRate
		symbol := operation_setting.GetGeneralSetting().CustomCurrencySymbol
		if symbol == "" {
			symbol = "¤"
		}
		if rate <= 0 {
			rate = 1
		}
		v := usd * rate
		return fmt.Sprintf("%s%.6f", symbol, v)
	case operation_setting.QuotaDisplayTypeTokens:
		return fmt.Sprintf("%d", quota)
	default:
		return fmt.Sprintf("＄%.6f", q/common.QuotaPerUnit)
	}
}

// LogJson 仅供测试使用 only for test
func LogJson(ctx context.Context, msg string, obj any) {
	jsonStr, err := common.Marshal(obj)
	if err != nil {
		LogError(ctx, fmt.Sprintf("json marshal failed: %s", err.Error()))
		return
	}
	LogDebug(ctx, fmt.Sprintf("%s | %s", msg, string(jsonStr)))
}
