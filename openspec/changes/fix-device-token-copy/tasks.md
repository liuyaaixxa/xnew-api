## 1. Frontend API Layer

- [x] 1.1 Add `getDeviceTokenKey(id)` function in `web/src/helpers/api/deviceToken.js` to call `GET /api/device-token/:id/key`

## 2. AddTokenModal Copy Fix

- [x] 2.1 After token creation success, call `getDeviceTokenKey` to fetch plaintext token and store in component state
- [x] 2.2 Update copy button handler to use plaintext token from state instead of `newToken.token`
- [x] 2.3 Clear plaintext token state when modal closes

## 3. Verification

- [x] 3.1 Test: create token → copy → paste confirms plaintext token in clipboard
- [x] 3.2 Test: modal UI still displays masked token format
