## ADDED Requirements

### Requirement: Copy plaintext token after creation
When a device token is created, the system SHALL provide the full plaintext token for clipboard copy. The UI display SHALL continue to show the masked version (`token_mask`).

#### Scenario: User creates token and clicks copy
- **WHEN** user creates a new device token and clicks the "copy" button in the success modal
- **THEN** the clipboard SHALL contain the full plaintext token (e.g., `dt-xxxxxxxxxxxxxxxx`), not the masked version

#### Scenario: Token display remains masked
- **WHEN** a device token is created and shown in the success modal
- **THEN** the displayed token text SHALL use the masked format (e.g., `dt-t****7000`)

### Requirement: Frontend API for retrieving plaintext token
The frontend API layer SHALL provide a function to call the `GetDeviceTokenKey` backend endpoint to retrieve the full plaintext token by token ID.

#### Scenario: API function returns plaintext token
- **WHEN** the frontend calls `getDeviceTokenKey(id)` after token creation
- **THEN** the backend SHALL return the full plaintext token string
