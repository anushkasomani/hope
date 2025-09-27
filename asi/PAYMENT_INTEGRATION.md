# x402 Payment Integration for Oracle Service

## Overview
This document describes the changes made to integrate x402 payments between the oracle and requestor agents, enabling monetization of the oracle service.

## Changes Made

### 1. Oracle Agent (`oracle agent/oracle_agent.py`)

**New Features:**
- **Payment Requirement**: Oracle now requires x402 payment before providing price data
- **Pricing Model**: Set at 1000 USDC (0.001 USDC with 6 decimals)
- **Payment Verification**: Validates payment amount before processing requests
- **Enhanced Response Model**: Added success status and payment transaction info

**Key Changes:**
```python
# New message models
class OracleRequest(Model):
    currency: str
    payment_amount: int = 0  # x402 payment amount
    user_address: str = ""   # User's wallet address

class OracleResponse(Model):
    currency: str
    price_usd: float
    success: bool = True
    message: str = ""

# Payment processing
async def process_x402_payment(operations, payment_amount, user_address):
    # Integrates with x402_payment_processor.js
```

### 2. Requestor Agent (`requestor agent/requestor_agent.py`)

**New Features:**
- **Payment Processing**: Sends x402 payment before requesting oracle data
- **Payment Verification**: Handles payment verification responses
- **Enhanced Logging**: Better error handling and success/failure logging
- **Increased Interval**: Changed from 10s to 30s to allow payment processing time

**Key Changes:**
```python
# Payment processing before request
operations = [{"type": "oracle_price", "currency": currency_to_fetch}]
tx_hash = await process_x402_payment(operations, ORACLE_PRICE, user_address)

# Enhanced request with payment info
await ctx.send(ORACLE_AGENT_ADDRESS, OracleRequest(
    currency=currency_to_fetch,
    payment_amount=ORACLE_PRICE,
    user_address=user_address
))
```

### 3. Test Script (`test_payment_flow.py`)

**Features:**
- Environment variable validation
- Dependency checking
- Direct x402 payment processor testing
- Integration verification

## Payment Flow

1. **Requestor Agent** prepares payment for oracle service
2. **x402 Payment Processor** processes the payment on-chain
3. **Requestor Agent** sends request with payment verification to Oracle
4. **Oracle Agent** validates payment amount
5. **Oracle Agent** processes x402 payment and fetches price data
6. **Oracle Agent** returns price data with transaction confirmation

## Pricing Model

- **Base Price**: 1000 USDC (0.001 USDC with 6 decimals)
- **Currency**: USDC on Polygon Amoy testnet
- **Payment Method**: x402 protocol integration

## Environment Variables Required

```bash
ORACLE_SEED=your_oracle_seed_phrase
REQUESTER_SEED=your_requestor_seed_phrase
```

## Running the System

1. **Test the integration:**
   ```bash
   python test_payment_flow.py
   ```

2. **Start the Oracle Agent:**
   ```bash
   python "oracle agent/oracle_agent.py"
   ```

3. **Start the Requestor Agent:**
   ```bash
   python "requestor agent/requestor_agent.py"
   ```

## Expected Behavior

- Requestor agent will attempt payment every 30 seconds
- Oracle agent will only provide data after successful payment
- Both agents will log payment transactions and success/failure status
- Failed payments will result in no data being returned

## Troubleshooting

- Ensure `.env` file has required seed phrases
- Check that `x402_payment_processor.js` is accessible
- Verify network connectivity for x402 payment processing
- Monitor logs for payment transaction hashes

## Future Enhancements

- On-chain payment verification
- Dynamic pricing based on market conditions
- Payment retry mechanisms
- Multiple currency support
- Payment analytics and reporting
