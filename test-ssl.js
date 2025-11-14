#!/usr/bin/env node

/**
 * Test SSL Configuration
 * Verifies that SSL certificates are loaded correctly and checks expiry
 */

require('dotenv').config();
const VisaSSLConfig = require('./config/visa-ssl-config');

console.log('🔐 Testing SSL Configuration...\n');
console.log('=' .repeat(80));

try {
  // Initialize SSL configuration
  const sslConfig = new VisaSSLConfig();

  console.log('\n✅ SSL Configuration loaded successfully!\n');

  // Display configuration details
  console.log('📋 Configuration Details:');
  console.log('─'.repeat(80));
  console.log(`User ID:       ${sslConfig.userId.substring(0, 20)}...`);
  console.log(`Password:      ${'*'.repeat(20)}...`);
  console.log(`Cert Path:     ${sslConfig.certPath}`);
  console.log(`Key Path:      ${sslConfig.keyPath}`);
  console.log(`CA Path:       ${sslConfig.caPath}`);
  console.log('─'.repeat(80));

  // Check certificate expiry
  console.log('\n📅 Certificate Expiry Check:');
  console.log('─'.repeat(80));
  const certStatus = sslConfig.checkCertificateExpiry();

  console.log(`Expiry Date:        ${certStatus.expiryDate.toISOString()}`);
  console.log(`Days Remaining:     ${certStatus.daysRemaining}`);
  console.log(`Is Expired:         ${certStatus.isExpired ? '❌ YES' : '✅ NO'}`);
  console.log(`Needs Renewal:      ${certStatus.needsRenewal ? '⚠️  YES' : '✅ NO'}`);
  console.log('─'.repeat(80));

  // Test Auth Header
  console.log('\n🔑 Authentication Header:');
  console.log('─'.repeat(80));
  const authHeader = sslConfig.getAuthHeader();
  console.log(`Authorization: ${authHeader.substring(0, 30)}...`);
  console.log('─'.repeat(80));

  // Test HTTPS Agent
  console.log('\n🌐 HTTPS Agent Configuration:');
  console.log('─'.repeat(80));
  const httpsAgent = sslConfig.getHttpsAgent();
  console.log('✅ HTTPS Agent created with mutual TLS');
  console.log(`   Reject Unauthorized: ${httpsAgent.options.rejectUnauthorized}`);
  console.log(`   Request Cert:        ${httpsAgent.options.requestCert}`);
  console.log(`   Keep Alive:          ${httpsAgent.options.keepAlive}`);
  console.log(`   Max Sockets:         ${httpsAgent.options.maxSockets}`);
  console.log(`   Timeout:             ${httpsAgent.options.timeout}ms`);
  console.log('─'.repeat(80));

  // Test Axios Config
  console.log('\n⚙️  Axios Configuration:');
  console.log('─'.repeat(80));
  const axiosConfig = sslConfig.getAxiosConfig();
  console.log('✅ Axios config ready for API calls');
  console.log(`   Headers: ${Object.keys(axiosConfig.headers).join(', ')}`);
  console.log(`   Timeout: ${axiosConfig.timeout}ms`);
  console.log('─'.repeat(80));

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ SSL CONFIGURATION TEST PASSED');
  console.log('='.repeat(80));

  if (certStatus.needsRenewal) {
    console.log('\n⚠️  WARNING: Certificate renewal needed soon!');
    console.log(`   Action required before: ${certStatus.expiryDate.toISOString()}`);
  }

  console.log('\n✅ Ready to connect to Visa API with mutual TLS\n');

  process.exit(0);

} catch (error) {
  console.error('\n❌ SSL Configuration Test Failed:');
  console.error('─'.repeat(80));
  console.error(error.message);
  console.error('─'.repeat(80));

  console.error('\n🔍 Troubleshooting Steps:');
  console.error('1. Check that .env file exists and has correct values');
  console.error('2. Verify SSL certificates are in certs/ directory:');
  console.error('   - certs/cert.pem');
  console.error('   - certs/key.pem');
  console.error('   - certs/ca.pem');
  console.error('3. Ensure certificate files are in PEM format');
  console.error('4. Check file permissions (should be readable)');
  console.error('\n❌ Test Failed\n');

  process.exit(1);
}
