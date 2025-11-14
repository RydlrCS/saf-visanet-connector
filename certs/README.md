# SSL/TLS Certificates for Visa API

## Certificate Files

### Standard Names
- `ca.pem` - DigiCert Global Root CA certificate
- `cert.pem` - SBX-2024 Production Root certificate  
- `key.pem` - SBX-2024 Production Intermediate certificate

### Original Files
- `DigiCertGlobalRootCA (2).crt` - CA root certificate
- `SBX-2024-Prod-Root (2).pem` - Client root certificate
- `SBX-2024-Prod-Inter (2).pem` - Intermediate certificate

## Certificate Details

### Expiry Information
- **Certificate Expiry:** February 25, 2026 16:47 GMT
- **Days Remaining:** 102 days (as of November 14, 2025)
- **Renewal Alert:** January 25, 2026 (30 days before expiry)

### Certificate Chain
1. **Root CA:** DigiCert Global Root CA
2. **Client Certificate:** SBX-2024-Prod-Root
3. **Intermediate:** SBX-2024-Prod-Inter

## Verification Commands

```bash
# View certificate details
openssl x509 -in cert.pem -text -noout

# Check certificate expiry
openssl x509 -in cert.pem -noout -dates

# Verify certificate chain
openssl verify -CAfile ca.pem cert.pem

# Check certificate matches private key (if applicable)
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5
# (MD5 hashes should match)
```

## Security Notes

### File Permissions
```bash
# Set secure permissions
chmod 700 certs/
chmod 600 certs/*.pem
```

### Access Control
- Certificates are READ-ONLY for owner
- Directory is accessible only by owner
- Keys should NEVER be committed to version control
- All certificate files are in .gitignore

### Certificate Renewal Process
1. Monitor expiry date (set alert 30 days before)
2. Request new certificates from Visa Developer Portal
3. Download new certificate files
4. Test in sandbox environment first
5. Update production certificates
6. Verify connectivity with `npm run test:ssl`

## Certificate Usage

These certificates are used for:
- Mutual TLS (mTLS) authentication with Visa API
- Secure HTTPS communication
- API request authentication
- SSL/TLS handshake verification

## Troubleshooting

### Common Issues

**Certificate not trusted:**
- Ensure CA certificate is correct
- Check certificate chain order
- Verify certificate is not expired

**Connection refused:**
- Check firewall rules
- Verify API endpoint URL
- Ensure certificates are in correct format (PEM)

**Invalid certificate:**
- Check expiry date
- Verify certificate matches private key
- Ensure certificate is for correct environment (sandbox/production)

## Environment Configuration

Update `.env` file with certificate paths:
```bash
VISA_CERT_PATH=./certs/cert.pem
VISA_KEY_PATH=./certs/key.pem
VISA_CA_PATH=./certs/ca.pem
```

## Production Checklist

- [x] Certificates downloaded from Visa Portal
- [x] Files renamed to standard names
- [x] Permissions set correctly (600)
- [x] Certificate chain verified
- [ ] Expiry monitoring configured
- [ ] SSL test passed (`npm run test:ssl`)
- [ ] API connection test passed (`npm run test:api`)

---

**Last Updated:** November 14, 2025  
**Next Review:** January 25, 2026 (certificate renewal reminder)  
**Certificate Authority:** DigiCert
