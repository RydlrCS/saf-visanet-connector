# SAF (Sustainable Aviation Fuel) Data Integration Standards

## Overview

This directory contains reference documentation for Sustainable Aviation Fuel (SAF) accounting policies and data integration standards that will be implemented in the VisaNet connector system.

## Reference Documents

### 1. IATA SAF Accounting & Reporting Methodology
**File:** `iata-sustainable-aviation-fuel-saf-accounting--reporting-methodology.pdf`

**Purpose:** International Air Transport Association (IATA) standards for:
- SAF lifecycle emission calculations
- Carbon intensity measurement and reporting
- Sustainability criteria verification
- Book-and-claim accounting system
- Registry and tracking mechanisms

**Key Integration Points:**
- Carbon footprint calculation APIs
- Emission reduction tracking
- Sustainability certificate validation
- Reporting data structures

### 2. SAF Accounting Policy Paper
**File:** `saf-accounting-policy-paper_20230905_final.pdf`

**Purpose:** Comprehensive accounting policy framework covering:
- Financial accounting standards for SAF transactions
- Book-and-claim methodology
- Emission reduction allocation
- Compliance and verification requirements
- Stakeholder reporting standards

**Key Integration Points:**
- Transaction categorization for SAF purchases
- Environmental attribute tracking
- Compliance data fields
- Audit trail requirements

### 3. Airfare, Jet Fuel Price, and Inflation Analysis
**File:** `Airfare-jet-fuel-price-and-inflation.pdf`

**Purpose:** Economic analysis for:
- Fuel price volatility modeling
- SAF premium pricing structures
- Market dynamics and trends
- Cost allocation methodologies

**Key Integration Points:**
- Dynamic pricing calculations
- Cost differential tracking
- Market rate integration
- Price indexing mechanisms

### 4. AEF Airlines VIE Report
**File:** `AEF_Airlines_VIE_May24 Final.pdf`

**Purpose:** Aviation Environment Federation (AEF) Vienna report on:
- Industry best practices
- Regulatory compliance requirements
- Environmental impact assessment
- Stakeholder engagement frameworks

**Key Integration Points:**
- Compliance data structures
- Regulatory reporting formats
- Environmental metric calculations
- Stakeholder data APIs

## Data Integration Standards

### Transaction Data Model

```javascript
/**
 * SAF Transaction Data Structure
 * Standardized format for all SAF-related payment transactions
 */
{
  // Core Transaction Fields
  transactionId: String,          // Unique transaction identifier
  transactionType: String,         // 'SAF_PURCHASE', 'CARBON_CREDIT', 'OFFSET'
  timestamp: ISO8601DateTime,      // UTC timestamp
  
  // Financial Data
  amount: Decimal(10,2),          // Transaction amount in base currency
  currency: String(3),            // ISO 4217 currency code
  exchangeRate: Decimal(10,6),    // If currency conversion applied
  
  // SAF-Specific Data
  safData: {
    fuelType: String,             // 'HEFA', 'ATJ', 'FT', 'SIP', etc.
    volume: Decimal(10,3),        // Liters or gallons
    volumeUnit: String,           // 'LITERS', 'GALLONS'
    carbonIntensity: Decimal(10,4), // gCO2e/MJ
    emissionReduction: Decimal(10,2), // Percentage vs conventional jet fuel
    sustainabilityCert: String,   // Certificate ID
    certificationScheme: String,  // 'ISCC', 'RSB', 'SCS', etc.
  },
  
  // Book-and-Claim Data
  bookAndClaim: {
    allocationMethod: String,     // 'PRO_RATA', 'SPECIFIC_FLIGHT', 'POOL'
    registryId: String,          // SAF registry identifier
    retirementStatus: Boolean,   // Certificate retired?
    retirementDate: ISO8601DateTime,
  },
  
  // Compliance & Reporting
  compliance: {
    regulatoryFramework: [String], // ['CORSIA', 'EU_ETS', 'ReFuelEU']
    reportingPeriod: String,        // 'Q1_2025', 'ANNUAL_2025'
    verificationStatus: String,     // 'PENDING', 'VERIFIED', 'REJECTED'
    auditorId: String,             // Third-party verifier ID
  },
  
  // Payment Method Integration
  paymentMethod: {
    cardNumber: String(masked),    // Last 4 digits only
    cardType: String,              // 'VISA', 'MASTERCARD'
    authorizationCode: String,     // Visa authorization code
    merchantId: String,            // Merchant identifier
  },
  
  // Audit Trail
  audit: {
    createdBy: String,
    createdAt: ISO8601DateTime,
    modifiedBy: String,
    modifiedAt: ISO8601DateTime,
    version: Integer,
    changeLog: [Object]
  }
}
```

### API Endpoints (Future Implementation)

```javascript
// SAF Transaction Endpoints
POST   /api/v1/saf/transactions          // Create SAF transaction
GET    /api/v1/saf/transactions/:id      // Get transaction details
GET    /api/v1/saf/transactions          // List transactions (with filters)
PATCH  /api/v1/saf/transactions/:id      // Update transaction
DELETE /api/v1/saf/transactions/:id      // Cancel transaction

// Reporting Endpoints
GET    /api/v1/saf/reports/emissions     // Emission reduction report
GET    /api/v1/saf/reports/compliance    // Compliance report
GET    /api/v1/saf/reports/financial     // Financial summary
POST   /api/v1/saf/reports/export        // Export reports (PDF/Excel)

// Certificate Management
POST   /api/v1/saf/certificates          // Register certificate
GET    /api/v1/saf/certificates/:id      // Get certificate details
PATCH  /api/v1/saf/certificates/:id/retire // Retire certificate

// Registry Integration
GET    /api/v1/saf/registry/verify       // Verify certificate in registry
POST   /api/v1/saf/registry/sync         // Sync with external registry
```

### Database Schema

```sql
-- SAF Transactions Table
CREATE TABLE saf_transactions (
    id UUID PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Financial fields
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,6),
    
    -- SAF specific
    fuel_type VARCHAR(50),
    volume DECIMAL(10,3),
    volume_unit VARCHAR(20),
    carbon_intensity DECIMAL(10,4),
    emission_reduction DECIMAL(10,2),
    sustainability_cert VARCHAR(255),
    certification_scheme VARCHAR(50),
    
    -- Book and claim
    allocation_method VARCHAR(50),
    registry_id VARCHAR(255),
    retirement_status BOOLEAN DEFAULT FALSE,
    retirement_date TIMESTAMP WITH TIME ZONE,
    
    -- Compliance
    regulatory_frameworks JSONB,
    reporting_period VARCHAR(50),
    verification_status VARCHAR(50),
    auditor_id VARCHAR(255),
    
    -- Payment
    card_last_four CHAR(4),
    card_type VARCHAR(50),
    authorization_code VARCHAR(255),
    merchant_id VARCHAR(255),
    
    -- Audit
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_by VARCHAR(255),
    modified_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1,
    
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_sustainability_cert (sustainability_cert)
);

-- Sustainability Certificates Table
CREATE TABLE sustainability_certificates (
    id UUID PRIMARY KEY,
    certificate_id VARCHAR(255) UNIQUE NOT NULL,
    certificate_type VARCHAR(50) NOT NULL,
    issuing_authority VARCHAR(255),
    issue_date DATE NOT NULL,
    expiry_date DATE,
    status VARCHAR(50) NOT NULL,
    
    -- SAF details
    fuel_type VARCHAR(50),
    production_pathway VARCHAR(100),
    feedstock VARCHAR(100),
    carbon_intensity DECIMAL(10,4),
    
    -- Volume covered
    total_volume DECIMAL(15,3),
    allocated_volume DECIMAL(15,3),
    remaining_volume DECIMAL(15,3),
    volume_unit VARCHAR(20),
    
    -- Registry
    registry_name VARCHAR(255),
    registry_url VARCHAR(500),
    registry_entry_id VARCHAR(255),
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    verifier_id VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_certificate_id (certificate_id),
    INDEX idx_status (status),
    INDEX idx_expiry_date (expiry_date)
);

-- Emission Tracking Table
CREATE TABLE emission_tracking (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES saf_transactions(id),
    
    -- Baseline emissions
    baseline_emissions DECIMAL(15,6),  -- tCO2e
    baseline_method VARCHAR(100),
    
    -- Actual emissions with SAF
    actual_emissions DECIMAL(15,6),    -- tCO2e
    
    -- Reduction achieved
    emissions_avoided DECIMAL(15,6),   -- tCO2e
    reduction_percentage DECIMAL(5,2),
    
    -- Calculation metadata
    calculation_method VARCHAR(100),
    calculation_date TIMESTAMP WITH TIME ZONE,
    verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_transaction_id (transaction_id)
);
```

## Implementation Roadmap

### Phase 1: Foundation (Current)
- [x] Configure Visa payment infrastructure
- [x] Set up two-way SSL authentication
- [x] Implement webhook handling
- [x] Document SAF integration requirements

### Phase 2: Core SAF Features (Q1 2026)
- [ ] Implement SAF transaction data model
- [ ] Create database schema for SAF tracking
- [ ] Build SAF-specific API endpoints
- [ ] Integrate certificate validation
- [ ] Implement book-and-claim allocation

### Phase 3: Compliance & Reporting (Q2 2026)
- [ ] Build compliance reporting system
- [ ] Integrate with SAF registries
- [ ] Implement audit trail logging
- [ ] Create regulatory report templates
- [ ] Add third-party verification hooks

### Phase 4: Advanced Features (Q3 2026)
- [ ] Real-time emission calculations
- [ ] Dynamic pricing integration
- [ ] Multi-currency SAF transactions
- [ ] Advanced analytics dashboard
- [ ] Stakeholder portal

### Phase 5: Optimization (Q4 2026)
- [ ] Performance optimization
- [ ] Advanced fraud detection
- [ ] Machine learning for price prediction
- [ ] Automated compliance checks
- [ ] Enhanced reporting capabilities

## Compliance Requirements

### CORSIA (Carbon Offsetting and Reduction Scheme for International Aviation)
- Track SAF usage by flight route
- Calculate lifecycle emissions
- Report to ICAO annually
- Maintain audit trail for 7 years

### EU Emissions Trading System (EU ETS)
- Monitor emissions by operator
- Submit verified emissions data
- Track allowance surrender
- Comply with MRV (Monitoring, Reporting, Verification)

### ReFuelEU Aviation
- Track SAF blend mandates (2% by 2025, 6% by 2030)
- Report on synthetic fuel usage
- Verify sustainability criteria
- Maintain compliance documentation

## Data Quality Standards

### Data Validation Rules
1. **Mandatory Fields:** All core transaction fields required
2. **Format Validation:** ISO standards for dates, currencies, codes
3. **Range Checks:** Positive values for amounts, valid percentages
4. **Referential Integrity:** Foreign key constraints enforced
5. **Duplicate Detection:** Unique transaction IDs

### Data Retention
- Transaction data: 10 years (regulatory requirement)
- Audit logs: 10 years
- Certificates: Indefinite (until superseded)
- Reports: 7 years

### Data Privacy
- PCI DSS compliance for payment data
- GDPR compliance for personal data
- Encryption at rest and in transit
- Access control and audit logging

## Integration Partners

### Expected Integrations
1. **SAF Registries:** ISCC, RSB, SCS
2. **Carbon Accounting:** Atmosfair, myclimate
3. **Reporting Platforms:** CORSIA registry, EU ETS
4. **Payment Processors:** Visa Direct, VisaNet Connect
5. **Airlines:** Booking systems, loyalty programs

## Support & Maintenance

### Documentation Updates
- Review quarterly
- Update with regulatory changes
- Incorporate industry best practices
- Align with IATA guidelines

### Version Control
- Semantic versioning for data models
- Backward compatibility for 2 major versions
- Migration scripts for schema changes
- API versioning strategy

---

**Document Version:** 1.0  
**Last Updated:** November 14, 2025  
**Next Review:** February 14, 2026  
**Owner:** SAF VisaNet Integration Team  
**Contact:** support@saf-visanet.com
