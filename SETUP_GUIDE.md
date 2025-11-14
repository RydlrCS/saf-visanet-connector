# SAF VisaNet Connector - Setup Guide

## 📋 Overview

This guide walks you through setting up the SAF VisaNet Connector with complete two-way SSL authentication, X-Pay-Token security, and message-level encryption.

## 🔐 Credentials Summary

### Two-Way SSL Authentication
- **User ID:** `ZIURSHX6SHIUA9A9NOZK21ITNMkZ0dgIv2mHUL4nmzazEbscM`
- **Password:** `0rzzV42QlBpVToeyzD4gUgRt7ZfQNnLn825R`
- **Certificate Expiry:** February 25, 2026 16:47
- **Status:** ✅ Certificates uploaded

### X-Pay-Token
- **API Key:** `QUH5ZW31UCG48IDFANI621MmaHWA_BoULUdiv92Q0prwC1bVI`
- **Public Key:** 🔑 To be generated (see step 3 below)

### Message Encryption
- **Key ID:** `37add489-8449-4497-a91c-98c2a8e74a57`

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
cd /Users/ted/git\ clone\ repos/saf-visanet-connector

# Install Node.js dependencies
npm install

# Install required packages
npm install axios https dotenv
npm install node-jose  # For JWE message encryption
npm install winston    # For logging
npm install helmet     # For security headers
npm install express-rate-limit  # For rate limiting
```

### Step 2: Configure Environment

```bash
# Copy production environment file
cp .env.production .env

# Edit with your specific configurations if needed
nano .env
```

### Step 3: Generate X-Pay-Token Keys

```bash
# Make script executable
chmod +x scripts/generate-xpay-keypair.js

# Generate RSA key pair
node scripts/generate-xpay-keypair.js
```

**Output:** The script will generate:
- `keys/xpay_public.pem` - Public key for Visa Developer Portal
- `keys/xpay_private.pem` - Private key (keep secure!)

**Action Required:**
1. Copy the public key displayed in the terminal
2. Log in to [Visa Developer Portal](https://developer.visa.com)
3. Navigate to your project → Credentials → Encryption Keys
4. Paste the public key

### Step 4: Verify SSL Certificates

Ensure your Visa SSL certificates are in the `certs/` directory:

```bash
# Check certificates
ls -la certs/

# Should contain:
# - cert.pem     (Client certificate)
# - key.pem      (Private key)
# - ca.pem       (CA certificate)

# Verify certificate validity
openssl x509 -in certs/cert.pem -text -noout | grep "Not After"
```

**Expected output:** Not After: Feb 25 16:47:00 2026 GMT

### Step 5: Set Up Directory Structure

```bash
# Create required directories
mkdir -p logs
mkdir -p keys
mkdir -p certs

# Set appropriate permissions
chmod 700 keys/
chmod 700 certs/
chmod 600 certs/*.pem
chmod 600 keys/*.pem
```

### Step 6: Configure .gitignore

```bash
# Add to .gitignore (if not already present)
cat >> .gitignore << EOF

# Sensitive files
.env
.env.production
.env.local

# Certificates and keys
certs/*.pem
keys/*.pem

# Logs
logs/
*.log

# Node modules
node_modules/

EOF
```

---

## 🧪 Testing the Configuration

### Test 1: SSL Certificate Loading

Create a test file `test-ssl.js`:

```javascript
require('dotenv').config();
const VisaSSLConfig = require('./config/visa-ssl-config');

try {
  const sslConfig = new VisaSSLConfig();
  console.log('✅ SSL Configuration loaded successfully');
  
  const certStatus = sslConfig.checkCertificateExpiry();
  console.log('\nCertificate Status:', certStatus);
  
} catch (error) {
  console.error('❌ SSL Configuration error:', error.message);
}
```

Run test:
```bash
node test-ssl.js
```

### Test 2: X-Pay-Token Generation

Create a test file `test-xpay.js`:

```javascript
require('dotenv').config();
const XPayTokenConfig = require('./config/xpay-token-config');

try {
  const xpayConfig = new XPayTokenConfig();
  console.log('✅ X-Pay-Token Configuration loaded successfully');
  
  // Generate test token
  const token = xpayConfig.generateXPayToken('/visadirect/fundstransfer/v1/pushfundstransactions');
  console.log('\nTest X-Pay-Token:', token);
  
  // Display public key
  console.log('\n📋 Public Key for Visa Portal:');
  console.log(xpayConfig.getPublicKeyPEM());
  
} catch (error) {
  console.error('❌ X-Pay-Token error:', error.message);
}
```

Run test:
```bash
node test-xpay.js
```

### Test 3: Full API Connection Test

Create a test file `test-visa-api.js`:

```javascript
require('dotenv').config();
const axios = require('axios');
const VisaSSLConfig = require('./config/visa-ssl-config');
const XPayTokenConfig = require('./config/xpay-token-config');

async function testVisaAPI() {
  try {
    const sslConfig = new VisaSSLConfig();
    const xpayConfig = new XPayTokenConfig();
    
    // Test endpoint: Visa Direct - Pull Funds Transactions
    const resourcePath = '/visadirect/fundstransfer/v1/pullfundstransactions';
    const url = `${process.env.VISA_API_URL}${resourcePath}`;
    
    // Get configurations
    const axiosConfig = sslConfig.getAxiosConfig();
    const xpayHeaders = xpayConfig.getHeaders(resourcePath);
    
    // Merge headers
    axiosConfig.headers = {
      ...axiosConfig.headers,
      ...xpayHeaders
    };
    
    console.log('🔄 Testing Visa API connection...');
    console.log('URL:', url);
    
    // Make test request (will fail without valid payload, but tests auth)
    const response = await axios.get(url, axiosConfig);
    
    console.log('✅ API Connection Successful!');
    console.log('Status:', response.status);
    
  } catch (error) {
    if (error.response) {
      console.log('📡 API Response received (auth working):');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data?.message || 'No message');
      
      if (error.response.status === 401) {
        console.error('❌ Authentication failed - check credentials');
      } else if (error.response.status === 400) {
        console.log('✅ Auth OK (400 = bad request payload as expected)');
      }
    } else {
      console.error('❌ Connection error:', error.message);
    }
  }
}

testVisaAPI();
```

Run test:
```bash
node test-visa-api.js
```

---

## 📊 Configuration Validation Checklist

- [ ] Environment file configured (`.env`)
- [ ] SSL certificates in `certs/` directory
- [ ] X-Pay-Token keys generated in `keys/` directory
- [ ] Public key uploaded to Visa Developer Portal
- [ ] Certificate expiry date verified (Feb 25, 2026)
- [ ] All credentials match production values
- [ ] Directory permissions set correctly
- [ ] `.gitignore` configured to exclude sensitive files
- [ ] Test scripts pass successfully
- [ ] Logs directory created

---

## 🔒 Security Best Practices

1. **Certificate Management:**
   - Monitor certificate expiry (alert 30 days before)
   - Rotate certificates before expiration
   - Keep backup certificates in secure location

2. **Key Storage:**
   - Never commit keys/certificates to Git
   - Use environment variables for sensitive data
   - Restrict file permissions (600 for keys, 700 for directories)

3. **API Keys:**
   - Rotate API keys periodically
   - Use different keys for sandbox vs production
   - Log all API key usage

4. **Encryption:**
   - Enable message-level encryption for PCI data
   - Use strong encryption keys (256-bit)
   - Rotate encryption keys annually

---

## 📚 API Endpoints Available

### Visa Direct API
- **Push Funds (OCT):** Send money to recipient cards
- **Pull Funds (AFT):** Request money from sender cards
- **Reverse Funds (AFTR):** Reverse previous transactions
- **Status Query:** Check transaction status

### VisaNet Connect API
- **Authorization:** Approve card payments
- **Void:** Cancel authorizations
- **Settlement Inquiry:** Check settlement positions

---

## 🆘 Troubleshooting

### Certificate Errors

```bash
# Verify certificate format
openssl x509 -in certs/cert.pem -text -noout

# Check private key matches certificate
openssl x509 -noout -modulus -in certs/cert.pem | openssl md5
openssl rsa -noout -modulus -in certs/key.pem | openssl md5
# (MD5 hashes should match)
```

### Connection Issues

```bash
# Test network connectivity to Visa API
curl -I https://api.visa.com

# Test with certificates
curl --cert certs/cert.pem --key certs/key.pem \
     --cacert certs/ca.pem \
     https://api.visa.com/visadirect/fundstransfer/v1/pullfundstransactions
```

### X-Pay-Token Issues

- Ensure timestamp is current (within 5 minutes)
- Verify public key is registered in Visa portal
- Check signature algorithm matches (SHA-256)

---

## 📞 Support Resources

- **Visa Developer Portal:** https://developer.visa.com
- **API Documentation:** https://developer.visa.com/capabilities/visa_direct
- **Certificate Expiry:** Feb 25, 2026 16:47
- **Project Repository:** https://github.com/RydlrCS/visanet-api

---

## 🎯 Next Steps

1. Complete all items in validation checklist
2. Run all test scripts successfully
3. Configure monitoring and alerts
4. Set up certificate renewal process (before Feb 2026)
5. Integrate with your application
6. Test in Visa sandbox environment
7. Submit for production certification
8. Go live!

---

**Last Updated:** November 14, 2025  
**Certificate Expiry:** February 25, 2026 16:47  
**Status:** Ready for Integration ✅
