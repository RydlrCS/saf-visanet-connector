#!/usr/bin/env node

/**
 * Generate RSA Key Pair for X-Pay-Token
 * Run this script to generate the public/private key pair needed for X-Pay-Token authentication
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating RSA Key Pair for X-Pay-Token...\n');

// Configuration
const keysDir = path.join(__dirname, '..', 'keys');
const publicKeyPath = path.join(keysDir, 'xpay_public.pem');
const privateKeyPath = path.join(keysDir, 'xpay_private.pem');

// Create keys directory if it doesn't exist
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
  console.log(`✅ Created directory: ${keysDir}\n`);
}

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Save keys to files
fs.writeFileSync(publicKeyPath, publicKey);
fs.writeFileSync(privateKeyPath, privateKey);

console.log('✅ RSA Key Pair Generated Successfully!\n');
console.log('📁 File Locations:');
console.log(`   Public Key:  ${publicKeyPath}`);
console.log(`   Private Key: ${privateKeyPath}\n`);

console.log('=' .repeat(80));
console.log('📋 COPY THIS PUBLIC KEY TO VISA DEVELOPER PORTAL');
console.log('=' .repeat(80));
console.log('\n1. Log in to Visa Developer Portal');
console.log('2. Navigate to your project credentials');
console.log('3. Find the "Encryption Key" or "Public Key" section');
console.log('4. Paste the following public key:\n');
console.log('─'.repeat(80));
console.log(publicKey);
console.log('─'.repeat(80));

console.log('\n⚠️  SECURITY NOTES:');
console.log('   • Keep your private key (xpay_private.pem) SECURE and NEVER share it');
console.log('   • Add keys/ directory to .gitignore to prevent committing keys to Git');
console.log('   • Back up your keys in a secure location');
console.log('   • Rotate keys periodically for enhanced security\n');

console.log('✅ Setup complete! Your X-Pay-Token configuration is ready.\n');
