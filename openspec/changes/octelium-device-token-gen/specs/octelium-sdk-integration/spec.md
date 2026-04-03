## ADDED Requirements

### Requirement: Octelium SDK client initialization
The system SHALL initialize an Octelium SDK client using `OCTELIUM_AUTH_TOKEN` and `OCTELIUM_DEFAULT_DOMAIN` environment variables. The client SHALL be created as a singleton and reused across requests.

#### Scenario: Service enabled with valid config
- **WHEN** `OCTELIUM_AUTH_TOKEN` and `OCTELIUM_DEFAULT_DOMAIN` are set
- **THEN** the Octelium client SHALL be initialized and `IsEnabled()` SHALL return true

#### Scenario: Service disabled without config
- **WHEN** `OCTELIUM_AUTH_TOKEN` is not set
- **THEN** `IsEnabled()` SHALL return false and token generation SHALL return an error

### Requirement: Auto-create Octelium user on token generation
When generating a device token, the system SHALL check if the user exists in Octelium cloud. If not, it SHALL create the user automatically.

#### Scenario: User does not exist in Octelium
- **WHEN** a device token is requested for user "alice" and user "newapi-alice" does not exist in Octelium
- **THEN** the system SHALL create user "newapi-alice" in Octelium with type HUMAN before generating the token

#### Scenario: User already exists in Octelium
- **WHEN** a device token is requested for user "alice" and user "newapi-alice" already exists in Octelium
- **THEN** the system SHALL skip user creation and proceed to token generation

### Requirement: Generate real auth-token via Credential
The system SHALL create a Credential of type AUTH_TOKEN for the user and call GenerateCredentialToken to obtain the real authentication token.

#### Scenario: Successful token generation
- **WHEN** the Octelium user exists and a Credential is created
- **THEN** the system SHALL call GenerateCredentialToken and return the AuthenticationToken string

#### Scenario: Token generation failure
- **WHEN** the Octelium API returns an error during credential creation or token generation
- **THEN** the system SHALL return the error to the caller without creating a local database record
