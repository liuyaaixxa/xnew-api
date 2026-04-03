# octelium-workload-user

## Overview
This capability enables the creation of Octelium users with WORKLOAD type for device authentication scenarios.

## Requirements
### Requirement: User Type SHALL be WORKLOAD
When creating an Octelium user for device token authentication, the system SHALL set the user type to `corev1.User_Spec_WORKLOAD`.

#### Scenario: Create user for device token
- **WHEN** a device token is created via the API
- **THEN** the Octelium user is created with `spec.Type` set to `WORKLOAD`
- **AND** the system returns success response
#### Scenario: Create user with existing username
- **WHEN** a device token is created for an username that already exists in Octelium
- **THEN** the existing user is returned (User already exists` with type `HUMAN`
- **AND** no new user is created
#### Scenario: Username format includes device name
- **WHEN** creating a device token with username "admin" and device name "dev01"
- **THEN** the Octelium username is set to `admin_dev01`
- **AND** the user type in the spec is `WORKLOAD`
### Requirement: Username Format SHALL Include Device Name
The creating an Octelium user for device token authentication, the system shall format the username as `{username}_{device_name}`.

#### Scenario: Standard device token creation
- **WHEN** creating a device token with username "admin" and device name "mydevice"
- **THEN** the Octelium username is set to `admin_mydevice`
#### Scenario: Device name with special characters
- **WHEN** creating a device token with device name containing hyphens, spaces, or special characters
- **THEN** the username is normalized to remove special characters and and replace hyphens with underscores
#### Scenario: Username uniqueness per device
- **WHEN** creating two device tokens with the same username "admin" but different device names "dev01" and "dev02"
- **THEN** two different Octelium users are created with unique names
