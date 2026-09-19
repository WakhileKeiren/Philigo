# Security Policy

## Our Commitment

PhiliGo handles health-related information for children. We take that seriously. This policy explains how we approach security, what we protect against, and how to report vulnerabilities.

## Supported Versions

Only the latest release of PhiliGo receives security updates. If you are running an older version, please update to the latest release before reporting an issue.

## Data Architecture

PhiliGo is designed with a **local-first, zero-backend architecture**. This is a deliberate security decision.

**No data leaves the device.** All user data — game state, adherence records, achievements, treatment day, PIN — is stored in the browser's `localStorage`. It is never transmitted to any server, API, or third party.

**No accounts.** Users do not create accounts, provide email addresses, or enter passwords. There is nothing to breach because there is no central database.

**No analytics.** The app does not include Google Analytics, Firebase, Mixpanel, or any other tracking SDK. We do not know how many people use PhiliGo or how they use it.

**No third-party scripts.** The only external resource loaded is Google Fonts, which is a CSS request and does not expose user data.

## What This Means for Security

Because there is no backend and no data transmission, the attack surface is minimal. There is no server to compromise, no database to leak, no API keys to steal.

The remaining security considerations are:

**Device-level security.** Data stored in `localStorage` is protected by the device's own security — screen lock, encryption, and OS sandboxing. If someone has physical access to an unlocked device, they can access the data.

**PIN protection.** The caregiver dashboard is protected by a four-digit PIN. This is a convenience feature, not cryptographic security. It prevents a child from casually opening the dashboard. It is not designed to stop a determined attacker with device access.

**Cross-site scripting.** The app uses `textContent` and element creation rather than `innerHTML` for user-supplied data, reducing XSS risk. Caregiver names and game scores are the only user inputs, and both are handled safely.

**Service worker scope.** The service worker caches only same-origin assets from the app's own domain. It does not intercept or cache requests to other domains.

## Reporting a Vulnerability

If you discover a security issue, please do not open a public issue. Instead:

**Email:** Send details to the maintainer via the contact information on the Linktree.

**Include:** A description of the issue, steps to reproduce, potential impact, and any suggested fix if you have one.

**Response time:** You can expect an acknowledgement within 72 hours. We will work with you to understand the issue and coordinate disclosure.

**Credit:** If you would like, we will credit you in the release notes when the fix is published.

## What We Will Not Do

We will not threaten legal action against security researchers who follow responsible disclosure. We will not ignore reports. We will not downplay valid concerns.

## Future Considerations

If PhiliGo is ever extended to include a backend — for example, clinic-side adherence syncing — the security model will need to change fundamentally. Any such extension would require:

- End-to-end encryption for data in transit and at rest
- Authentication with strong password or biometric options
- Role-based access control for healthcare workers
- Audit logging for clinical data access
- Compliance with Eswatini data protection law and, where applicable, GDPR
- Independent security review before deployment

Until and unless that happens, PhiliGo remains deliberately local-only and therefore deliberately low-risk.
