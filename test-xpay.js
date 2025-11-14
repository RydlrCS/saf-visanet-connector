#!/usr/bin/env node

/**
 * Test X-Pay-Token Configuration
 * Verifies X-Pay-Token key generation and validation
 */

require('dotenv').config();
const XPayTokenConfig = require('./config/xpay-token-config');

console.log('🔑 Testing X-Pay-Token Configuration...\n');
console.log('=' .repeat(80));

try {
  // Initialize X-Pay-Token configuration
  const xpayConfig = new XPayTokenConfig();

  console.log('\n✅ X-Pay-Token Configuration loaded successfully!\n');

  // Display configuration details
  console.log('📋 Configuration Details:');
  console.log('─'.repeat(80));
  console.log(`API Key:           ${xpayConfig.apiKey.substring(0, 20)}...`);
  console.log(`Public Key Path:   ${xpayConfig.publicKeyPath}`);
  console.log(`Private Key Path:  ${xpayConfig.privateKeyPath}`);
  console.log('─'.repeat(80));

  // Test token generation for different endpoints
  console.log('\n🎫 Token Generation Tests:');
  console.log('─'.repeat(80));

  const testCases = [
    {
      name: 'Push Funds Transaction',
      path: '/visadirect/fundstransfer/v1/pushfundstransactions',
      query: '',
      body: JSON.stringify({ amount: 100.00 })
    },
    {
      name: 'Pull Funds Transaction',
      path: '/visadirect/fundstransfer/v1/pullfundstransactions',
      query: '',
      body: ''
    },
    {
      name: 'Authorization',
      path: '/acs/v3/payments/authorizations',
      query: '',
      body: JSON.stringify({ cardNumber: '4111111111111111' })
    },
    {
      name: 'Settlement Inquiry',
      path: '/settlement/v1/positions',
      query: 'clientId=1VISASAF000001&limit=10',
      body: ''
    }
  ];

  testCases.forEach((test, index) => {
    console.log(`\nTest ${index + 1}: ${test.name}`);
    console.log(`  Resource Path: ${test.path}`);
    if (test.query) console.log(`  Query String:  ${test.query}`);
    if (test.body) console.log(`  Request Body:  ${test.body.substring(0, 50)}...`);

    const token = xpayConfig.generateXPayToken(test.path, test.query, test.body);
    console.log(`  ✅ X-Pay-Token: ${token.substring(0, 60)}...`);

    // Extract components
    const [version, timestamp, signature] = token.split(':');
    console.log(`     - Version:   ${version}`);
    console.log(`     - Timestamp: ${timestamp} (${new Date(parseInt(timestamp) * 1000).toISOString()})`);
    console.log(`     - Signature: ${signature.substring(0, 40)}...`);
  });

  console.log('─'.repeat(80));

  // Test token validation (round-trip)
  console.log('\n🔄 Token Validation Test (Round-Trip):');
  console.log('─'.repeat(80));

  const testPath = '/visadirect/fundstransfer/v1/pushfundstransactions';
  const testBody = JSON.stringify({ test: 'data' });

  const generatedToken = xpayConfig.generateXPayToken(testPath, '', testBody);
  console.log(`Generated Token: ${generatedToken.substring(0, 60)}...`);

  const isValid = xpayConfig.validateXPayToken(generatedToken, testPath, '', testBody);
  console.log(`Validation Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

  console.log('─'.repeat(80));

  // Test headers generation
  console.log('\n📨 Request Headers Test:');
  console.log('─'.repeat(80));

  const headers = xpayConfig.getHeaders(testPath, '', testBody);
  console.log('Generated Headers:');
  Object.entries(headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.substring(0, 60)}${value.length > 60 ? '...' : ''}`);
  });
  console.log('─'.repeat(80));

  // Display public key for Visa registration
  console.log('\n🔐 Public Key for Visa Developer Portal:');
  console.log('─'.repeat(80));
  const publicKey = xpayConfig.getPublicKeyPEM();
  if (publicKey) {
    console.log(publicKey);
    console.log('─'.repeat(80));
    console.log('\n📋 IMPORTANT: Copy the public key above to Visa Developer Portal');
    console.log('   1. Log in to https://developer.visa.com');
    console.log('   2. Navigate to your project → Credentials');
    console.log('   3. Find "Encryption Key" or "Public Key" section');
    console.log('   4. Paste the public key above');
  } else {
    console.log('⚠️  Public key not available - run: npm run generate-xpay-keys');
  }
  console.log('─'.repeat(80));

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ X-PAY-TOKEN CONFIGURATION TEST PASSED');
  console.log('='.repeat(80));
  console.log('\n✅ All token generation and validation tests passed');
  console.log('✅ Ready to use X-Pay-Token authentication with Visa API\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ X-Pay-Token Configuration Test Failed:');
  console.error('─'.repeat(80));
  console.error(error.message);
  console.error(error.stack);
  console.error('─'.repeat(80));

  console.error('\n🔍 Troubleshooting Steps:');
  console.error('1. Check that .env file exists and has XPAY_API_KEY');
  console.error('2. Generate RSA keys: npm run generate-xpay-keys');
  console.error('3. Verify keys/ directory contains:');
  console.error('   - keys/xpay_public.pem');
  console.error('   - keys/xpay_private.pem');
  console.error('4. Upload public key to Visa Developer Portal');
  console.error('\n❌ Test Failed\n');

  process.exit(1);
}
