## 1. SDK Dependency

- [x] 1.1 Add `github.com/octelium/octelium/apis` and gRPC dependencies to go.mod
- [x] 1.2 Run `go mod tidy` to resolve all transitive dependencies

## 2. Rewrite OcteliumService

- [x] 2.1 Add Octelium SDK client field and corev1 client to OcteliumService struct
- [x] 2.2 Update `GetOcteliumService()` to initialize SDK client with `OCTELIUM_AUTH_TOKEN` env var
- [x] 2.3 Add `ensureOcteliumUser(ctx, username)` method: GetUser → if not found → CreateUser
- [x] 2.4 Rewrite `GenerateAuthToken()`: call ensureOcteliumUser → CreateCredential → GenerateCredentialToken → return real token
- [x] 2.5 Update `RevokeAuthToken()` to delete credential via SDK (best-effort)
- [x] 2.6 Remove `generateMockToken()` function and related placeholder code

## 3. Update GenerateTokenRequest

- [x] 3.1 Add `Username` field to `GenerateTokenRequest` to pass the system user's login name

## 4. Update Controller

- [x] 4.1 Pass the current user's username to `GenerateTokenRequest` in `AddDeviceToken` controller

## 5. Testing

- [x] 5.1 Run `go build` to verify compilation
- [x] 5.2 Run existing tests `go test ./service/...` to verify no regressions
- [x] 5.3 Manual test: create device token via API, verify real auth-token is generated
- [x] 5.4 Manual test: verify token can be copied as plaintext
