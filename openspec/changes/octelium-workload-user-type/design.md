# Context
The `OcteliumService` manages integration with Octelium cloud for device token management. Currently, users are created with type `HUMAN` and username format `newapi-{username}`. This needs to change to support workload/device scenarios.

## Goals / Non-goals
**Goals:**
- Change user type from `HUMAN` to `WORKLOAD` for device tokens
- Change username format from `newapi-{username}` to `{username}_{device_name}`
- Maintain backward compatibility with existing tokens (already created users continue to work)
**Non-Goals:**
- Migration of existing HUMAN users to WORKLOAD
- Changing the credential naming format
- Modifying the Octelium API client configuration
## Decisions
### Decision 1: User type change
**Choice**: Use `corev1.User_Spec_WORKLOAD` instead of `corev1.User_Spec_HUMAN`
**rationale**: Device tokens are used for machine-to-machine authentication, not human users. WORKLOAD type is appropriate for service accounts, automated workloads, and machine identity.
**alternatives considered**:
- Keep HUMAN type: Not suitable for device scenarios, requires human-level permissions
- Create separate user types per device: adds unnecessary complexity
### Decision 2: username format
**choice**: `{username}_{device_name}` format (e.g., `admin_dev01`)
**rationale**:
- More descriptive and easier to identify the purpose
- Aligns with Octelium's workload naming conventions
- Each device gets its own unique user in Octelium
- Better organization and auditability
**alternatives considered**:
- Keep `newapi-` prefix: makes names longer, less intuitive
- Use UUID: harder to read and remember
- Include system name: redundant since we already identifies the system
## risks / trade-offs
### Risk: Existing users become orphaned
**mitigation**: Accept as trade-off - existing HUMAN users will remain but type HUMAN. New users will be WORKLOAD. This is acceptable as the use case.
### Risk: Username collisions
**mitigation**: New format `{username}_{device_name}` is less likely to collide with existing `newapi-{username}` format since device names are typically different from system usernames.
## Migration Plan
1. Deploy the change - no migration needed for existing users
2. New device tokens will use new WORKLOAD user type
3. Test with Octelium CLI to verify user creation
## open questions
- None - the design is straightforward
