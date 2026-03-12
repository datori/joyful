## ADDED Requirements

### Requirement: CLI generates joyful:// QR codes for device linking
When the CLI generates a QR code payload for linking a mobile device (e.g., for account restore / add device), the payload URL SHALL use the `joyful://` scheme. The CLI SHALL NOT generate QR payloads using `handy://` or any other scheme.

#### Scenario: QR code uses correct URL scheme
- **WHEN** the CLI generates a QR code for mobile device linking
- **THEN** the QR payload starts with `joyful://`

#### Scenario: App can handle the QR link
- **WHEN** the mobile app scans a CLI-generated QR code
- **THEN** the app recognizes the `joyful://` deep link and processes the auth payload successfully
