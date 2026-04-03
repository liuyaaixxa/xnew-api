# Octelium Workload User Type

## Why

Currently, when creating device tokens through the Octelium integration, the Octelium user is created with type `HUMAN`. However, for device/workload scenarios, the user type should be `WORKLOAD` to properly represent machine-to-machine authentication. Additionally, the the username format should be `{system_username}_{device_name}` to better organize and identify device-specific users.

This change addresses these issues by modifying the user creation logic.

## What Changes
- Modify `ensureOcteliumUser` function to `service/octelium_service.go`
- change user type from `corev1.User_Spec_HUMAN` to `corev1.User_Spec_WORKLOAD`
- change username format from `newapi-{username}` to `{username}_{device_name}`
- the username format will be more descriptive and aligned with Octelium's workload user naming conventions
## Capabilities
### New Capabilities
- `octelium-workload-user`: Support for WORKLOAD user type in Octelium user creation
### Modified Capabilities
- None
## Impact
- `service/octelium_service.go`: Core changes to `ensureOcteliumUser` and `GenerateAuthToken` functions
- Device token creation API will now create users with type WORKLOAD
- Username format changed to include device name for better organization
