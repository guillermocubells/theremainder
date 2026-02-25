# Data Protection Impact Assessment (DPIA) — Auctions Module

**Project:** FrondaPrima  
**Module:** Auctions & Marketplace  
**Date:** 2026-02-25  
**DPO / Responsible:** [To be assigned]  
**Legal basis:** GDPR (Regulation (EU) 2016/679), LOPDGDD (Ley Orgánica 3/2018, Spain)

---

## 1. Description of Processing

| Aspect | Detail |
|--------|--------|
| **Purpose** | Enable users to list, bid on, and settle auctions for live plants via an online marketplace. |
| **Data subjects** | Buyers (bidders), sellers (lot submitters), platform admins. |
| **Personal data processed** | Name, email, IP address, billing/shipping address, tax ID (NIF/CIF), payment references (Stripe IDs), bid history, deposit amounts, device/user-agent strings, consent records. |
| **Special categories** | None. |
| **Data processors** | Stripe (payments, Connect onboarding), Resend (transactional email), Lovable Cloud (hosting & database). |
| **Retention** | Orders/invoices: 5 years (Spanish tax law). Bid history: duration of auction + 1 year. Consent logs: 5 years. Webhook events: 1 year. |
| **Cross-border transfers** | Stripe Inc. (US) — EU SCCs + DPF. Resend (US) — EU SCCs. |

---

## 2. Necessity & Proportionality

| Principle | Assessment |
|-----------|------------|
| **Lawfulness** | Art. 6(1)(b) contract performance (order fulfilment); Art. 6(1)(c) legal obligation (invoicing, tax); Art. 6(1)(f) legitimate interest (fraud prevention, platform integrity). |
| **Data minimisation** | Only data strictly needed for bidding, settlement, and invoicing is collected. Webhook payloads are redacted (PII stripped) before storage. |
| **Purpose limitation** | Auction data is used exclusively for transaction processing, dispute resolution, and legal compliance. Marketing requires separate opt-in consent. |
| **Storage limitation** | Automated retention policies; bid data anonymised after retention period. |
| **Accuracy** | Users can update profile/address data at any time via account settings. |

---

## 3. Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation | Residual risk |
|---|------|-----------|--------|------------|---------------|
| R1 | Unauthorised access to bid/payment data | Low | High | RLS on all tables; service-role-only writes for webhooks; JWT auth required. | Low |
| R2 | Payment data exposure | Low | Critical | No card data stored; Stripe handles PCI-DSS; only Stripe IDs stored. | Very Low |
| R3 | Seller identity leak (NIF/tax data) | Medium | High | `seller_profiles` table has RLS restricting access to owner + admin only. | Low |
| R4 | Webhook replay / duplicate processing | Medium | Medium | `webhook_events` table with unique `stripe_event_id` constraint; idempotent handlers. | Very Low |
| R5 | Consent not properly recorded | Low | High | `consent_logs` table captures all checkout consents with timestamps, user-agent, and event type. | Low |
| R6 | Cross-border transfer inadequacy | Low | Medium | Stripe DPF-certified; SCCs in place; Resend DPA signed. | Low |
| R7 | Excessive data in audit logs | Low | Medium | `audit_logs` and `webhook_events` payloads are redacted (card details, tokens stripped). | Very Low |
| R8 | Dispute evidence containing third-party PII | Medium | Medium | Evidence URLs stored in private storage; access restricted by RLS to dispute parties + admin. | Low |

---

## 4. Technical & Organisational Measures

### 4.1 Security Controls

- [x] Row Level Security (RLS) on every public table
- [x] Service-role client used only in backend functions (never exposed to frontend)
- [x] Stripe webhook signature verification (`stripe.webhooks.constructEvent`)
- [x] JWT-based authentication for all authenticated endpoints
- [x] Webhook payload redaction (PII fields stripped before storage)
- [x] HTTPS enforced on all endpoints
- [x] Admin role checks via `has_role()` database function

### 4.2 Privacy by Design

- [x] Consent checkboxes at checkout (terms, privacy, withdrawal waiver, platform fee)
- [x] Consent log table with immutable audit trail (`consent_logs`)
- [x] Cookie consent banner with granular preferences (essential, analytics, marketing)
- [x] Seller tax data only accessible to the seller and platform admins
- [x] Public shared lists strip user identifiers via Security Definer RPCs
- [x] Media storage private by default; signed URLs for access

### 4.3 Data Subject Rights

| Right | Implementation |
|-------|---------------|
| **Access (Art. 15)** | Account dashboard shows orders, bids, disputes, invoices. |
| **Rectification (Art. 16)** | Profile & address editing in account settings. |
| **Erasure (Art. 17)** | Manual request via contact form; blocked where legal retention applies (invoices, tax). |
| **Portability (Art. 20)** | Export functionality planned (orders, collection data). |
| **Objection (Art. 21)** | Marketing opt-out via account notifications settings. |
| **Withdrawal of consent** | Cookie preferences dialog; marketing opt-out at any time. |

---

## 5. Spanish-Specific Requirements (LOPDGDD)

- [x] Privacy policy available in Spanish at `/politica-de-privacidad`
- [x] Terms of sale at `/condiciones-de-venta` referencing Art. 103.d) RDL 1/2007 (perishable goods withdrawal waiver)
- [x] Invoice compliance: Spanish "factura rectificativa" for refunds with sequential numbering (`invoice_series`, `invoice_records`)
- [x] TicketBAI / VeriFactu readiness: `invoice_records` table includes hash chain (`current_hash`, `previous_hash`) for tamper-evident invoice registry
- [ ] **TODO:** Formal DPO designation if required (> 250 employees or large-scale systematic monitoring)
- [ ] **TODO:** Register processing activities with AEPD if threshold met
- [ ] **TODO:** Data Processing Agreement (DPA) archive for all sub-processors

---

## 6. Consultation

| Date | Party | Outcome |
|------|-------|---------|
| 2026-02-25 | Internal review | Initial DPIA drafted based on implemented controls. |
| _TBD_ | Legal counsel | Formal review pending. |
| _TBD_ | AEPD (if required) | Prior consultation under Art. 36 if high residual risk remains. |

---

## 7. Review Schedule

This DPIA must be reviewed:

1. **Annually** or when significant changes are made to auction processing
2. **Before** adding new data processors or cross-border transfers
3. **After** any personal data breach affecting auction data
4. **When** new functionality is added (e.g., identity verification, automated decision-making)

---

## 8. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Data Controller | ___________________ | __________ | __________ |
| DPO (if designated) | ___________________ | __________ | __________ |
| Technical Lead | ___________________ | __________ | __________ |
