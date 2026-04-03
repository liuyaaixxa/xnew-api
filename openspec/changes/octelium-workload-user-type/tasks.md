# tasks

## 1. Setup
- [x] 1.1 Add dependencies to package.json
  - **Description**: Add dependencies for package.json
- **acceptance**: Service compiles
 run `go test ./...`
- **impact**: Low
- **test data**: None

- **rollback**: None needed

## 2. core implementation
- [x] 2.1 modify `ensureOcteliumUser` in `service/octelium_service.go`
  - **Description**: Update `ensureOcteliumUser` function to change user type to WORKLOAD
  - **acceptance criteria**: Device token creation creates users with WORKLOAD type
  - **impact**: Existing device token creation API will create users with WORKLOAD type
  - **username format**: `{username}-{device_name}` (e.g., `admin-dev01`)
  - **test data**: Existing tokens still work
  - **rollback**: None needed (new users unaffected)

## 3. testing
- [x] 3.1 Test with curl - create device token with Octelium enabled
- [x] 3.2 Verify logs show user creation with WORKLOAD type
- [x] 3.3 Test second round - verify default configuration still works

- [x] 3.4 Test cleanup - delete test tokens

## 4. documentation
- [x] 4.1 Update .env.example with new configuration options
