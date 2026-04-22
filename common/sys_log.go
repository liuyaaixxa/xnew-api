package common

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// LogWriterMu protects concurrent access to gin.DefaultWriter/gin.DefaultErrorWriter
// during log file rotation. Acquire RLock when reading/writing through the writers,
// acquire Lock when swapping writers and closing old files.
var LogWriterMu sync.RWMutex

// sysZapLogger emits structured JSON for SysLog/SysError/FatalLog. It writes
// only to stdout/stderr — file-level duplication is handled by the logger
// package's gin writers. Its core isn't rebuilt on rotation because
// stdout/stderr stay stable for the process lifetime.
var sysZapLogger *zap.Logger

func init() {
	encoderCfg := zapcore.EncoderConfig{
		TimeKey:        "ts",
		LevelKey:       "level",
		MessageKey:     "msg",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.RFC3339TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
	}

	stdoutCore := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderCfg),
		zapcore.AddSync(os.Stdout),
		zap.LevelEnablerFunc(func(l zapcore.Level) bool { return l < zapcore.ErrorLevel }),
	)
	stderrCore := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderCfg),
		zapcore.AddSync(os.Stderr),
		zap.LevelEnablerFunc(func(l zapcore.Level) bool { return l >= zapcore.ErrorLevel }),
	)

	service := os.Getenv("SERVICE_NAME")
	if service == "" {
		service = "xnew-api"
	}
	sysZapLogger = zap.New(zapcore.NewTee(stdoutCore, stderrCore)).
		With(zap.String("service", service), zap.String("source", "sys"))
}

func SysLog(s string) {
	sysZapLogger.Info(s)
}

func SysError(s string) {
	sysZapLogger.Error(s)
}

func FatalLog(v ...any) {
	sysZapLogger.Fatal(fmt.Sprint(v...))
}

// LogStartupSuccess prints the ANSI-colored banner as plain text. This
// bypasses zap on purpose: the banner is a one-shot human-facing welcome
// message, not operational data — pushing it through Loki would only clutter
// queries with meaningless boilerplate.
func LogStartupSuccess(startTime time.Time, port string) {
	duration := time.Since(startTime)
	durationMs := duration.Milliseconds()

	networkIps := GetNetworkIps()

	LogWriterMu.RLock()
	defer LogWriterMu.RUnlock()

	fmt.Fprintf(gin.DefaultWriter, "\n")
	fmt.Fprintf(gin.DefaultWriter, "  \033[32m%s %s\033[0m  ready in %d ms\n", SystemName, Version, durationMs)
	fmt.Fprintf(gin.DefaultWriter, "\n")

	if !IsRunningInContainer() {
		fmt.Fprintf(gin.DefaultWriter, "  ➜  \033[1mLocal:\033[0m   http://localhost:%s/\n", port)
	}

	for _, ip := range networkIps {
		fmt.Fprintf(gin.DefaultWriter, "  ➜  \033[1mNetwork:\033[0m http://%s:%s/\n", ip, port)
	}

	fmt.Fprintf(gin.DefaultWriter, "\n")
}
