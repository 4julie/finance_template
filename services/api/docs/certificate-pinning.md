# Certificate Pinning Configuration

## Overview

Certificate pinning ensures Finance clients only trust specific TLS certificates when communicating with Supabase and PowerSync endpoints. This prevents MITM attacks even if a CA is compromised.

## Pinned Endpoints

| Service       | Domain                | Pin Type     | Rotation Schedule |
| ------------- | --------------------- | ------------ | ----------------- |
| Supabase API  | PROJECT.supabase.co   | SPKI SHA-256 | 90 days           |
| PowerSync     | INSTANCE.powersync.co | SPKI SHA-256 | 90 days           |
| ECB Rates API | www.ecb.europa.eu     | CA pin only  | N/A               |

## Pin Format

We pin the **Subject Public Key Info (SPKI)** hash, not the full certificate. This allows certificate renewal without pin changes, as long as the same key pair is used.

```
# Extract SPKI pin from a certificate
openssl x509 -in cert.pem -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | base64
```

## Platform Configuration

- **Android**: res/xml/network_security_config.xml
- **iOS**: Info.plist + TSKConfiguration (TrustKit)
- **Windows**: Custom HttpClientHandler with pin validation
- **Web**: Not applicable (browser handles TLS; use CSP + HSTS instead)

## Pin Rotation Process

1. **60 days before expiry**: Generate new key pair for the next certificate
2. **45 days before expiry**: Add the new SPKI hash as the backup pin in all clients
3. **30 days before expiry**: Ship client update with both pins
4. **On rotation day**: Deploy new certificate server-side
5. **After rotation**: Move new pin to primary, generate next backup

## Emergency Bypass

If a pin mismatch occurs and users are locked out:

1. **Feature flag**: Set certificate_pinning_enforced = false in the feature_flags table
2. **PowerSync sync**: Flag syncs to clients within minutes (no app update needed)
3. **Client behavior**: When flag is false, pin validation logs warnings but does not block
4. **Resolution**: Update pins in next app release, then re-enable enforcement

### Bypass Conditions

- Debug/staging builds: Pinning is disabled by default
- Release builds: Pinning enforced unless feature flag overrides
- Emergency bypass requires human approval (production flag change)

## Monitoring

- Pin validation failures are logged via CrashReporter (no PII)
- Alert threshold: > 10 pin failures per minute = potential rotation issue
- Dashboard: Track pin failure rate in SyncHealthMonitor metrics
