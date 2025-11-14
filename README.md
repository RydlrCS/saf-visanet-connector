# SAF VisaNet Connector

Production-ready connector for Visa APIs with complete security implementation including two-way SSL, X-Pay-Token authentication, and message-level encryption.

## 🎯 Features

- ✅ **Two-Way SSL Authentication** - Mutual TLS with Visa API
- ✅ **X-Pay-Token Security** - RSA signature-based authentication
- ✅ **Message Encryption** - JWE encryption for sensitive data
- ✅ **Visa Direct API** - Push/Pull/Reverse fund transfers
- ✅ **VisaNet Connect API** - Payment authorizations and voids
- ✅ **Certificate Management** - Automated expiry monitoring
- ✅ **Production Ready** - Full error handling and logging

## 📋 Credentials

### Two-Way SSL
- **User ID:** `ZIURSHX6SHIUA9A9NOZK21ITNMkZ0dgIv2mHUL4nmzazEbscM`
- **Certificate Expiry:** February 25, 2026 16:47 ✅

### X-Pay-Token
- **API Key:** `QUH5ZW31UCG48IDFANI621MmaHWA_BoULUdiv92Q0prwC1bVI`
- **Key Generation:** See setup guide

### Message Encryption
- **Key ID:** `37add489-8449-4497-a91c-98c2a8e74a57`

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate X-Pay-Token Keys

```bash
npm run generate-xpay-keys
```

Copy the displayed public key to Visa Developer Portal.

### 3. Configure Environment

```bash
cp .env.production .env
# Edit .env if needed
```

### 4. Verify SSL Certificates

Ensure certificates are in `certs/` directory:
- `cert.pem` - Client certificate
- `key.pem` - Private key  
- `ca.pem` - CA certificate

### 5. Run Tests

```bash
# Test SSL configuration
npm run test:ssl

# Test X-Pay-Token generation
npm run test:xpay

# Test API connectivity
npm run test:api
```

### 6. Start Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📚 Documentation

- **[Setup Guide](./SETUP_GUIDE.md)** - Complete installation and configuration
- **[API Reference](./api_reference%20(3).json)** - OpenAPI specification
- **[visanet-api Repository](https://github.com/RydlrCS/visanet-api)** - Reference implementation

## 🔧 Configuration Files

### Core Configuration
- `.env.production` - Production environment variables
- `config/visa-ssl-config.js` - Two-way SSL setup
- `config/xpay-token-config.js` - X-Pay-Token authentication
- `config/message-encryption-config.js` - JWE message encryption

### Security Files
- `certs/` - SSL certificates (not in Git)
- `keys/` - RSA keys for X-Pay-Token (not in Git)

## 🧪 Testing

```bash
# Run all tests
npm test

# SSL configuration test
npm run test:ssl

# X-Pay-Token test  
npm run test:xpay

# API connection test
npm run test:api

# Check certificate expiry
npm run cert:check
```

## 🔒 Security

- ✅ Mutual TLS (mTLS) authentication
- ✅ X-Pay-Token RSA signatures
- ✅ JWE message encryption
- ✅ PCI-DSS compliant
- ✅ Certificate expiry monitoring
- ✅ Rate limiting enabled
- ✅ Security headers (Helmet.js)

## 📊 API Endpoints

### Visa Direct (Fund Transfers)
- `POST /visadirect/fundstransfer/v1/pushfundstransactions` - Send money
- `POST /visadirect/fundstransfer/v1/pullfundstransactions` - Request money
- `POST /visadirect/fundstransfer/v1/reversefundstransactions` - Reverse transfer

### VisaNet Connect (Authorizations)
- `POST /acs/v3/payments/authorizations` - Authorize payment
- `POST /acs/v3/payments/authorizations/{id}/voids` - Void authorization
- `GET /settlement/v1/positions` - Settlement inquiry

## ⚠️ Important Dates

- **Certificate Expiry:** February 25, 2026 16:47
- **Alert Start:** January 25, 2026 (30 days before)
- **Action Required:** Renew certificate before expiry

## 🆘 Troubleshooting

### Certificate Issues
```bash
# Verify certificate
openssl x509 -in certs/cert.pem -text -noout

# Check expiry
openssl x509 -in certs/cert.pem -noout -dates
```

### Connection Issues
```bash
# Test Visa API connectivity
curl -I https://api.visa.com
```

### X-Pay-Token Issues
- Ensure public key is registered in Visa Developer Portal
- Verify timestamp is current (within 5 minutes)
- Check signature algorithm (SHA-256)

## 📞 Support

- **Documentation:** [Visa Developer Portal](https://developer.visa.com)
- **Reference Implementation:** [RydlrCS/visanet-api](https://github.com/RydlrCS/visanet-api)
- **Issues:** Create an issue in this repository

## 📝 License

MIT License - See LICENSE file for details

---

**Status:** ✅ Production Ready  
**Last Updated:** November 14, 2025  
**Certificate Valid Until:** February 25, 2026
