# x402 Service Agent with Fetch.ai Integration

This demonstrates a Fetch.ai uAgent that accepts x402 payments for premium services.

## Features

- **x402 Payment Integration**: Accepts EIP-712 signed payments
- **Price Calculation**: Smart pricing with bundling discounts
- **Multiple Operations**: Support for summarize, analyze, upload operations
- **Perplexity API**: Uses Perplexity instead of OpenAI for AI services
- **Mailbox Communication**: Standard uAgent messaging

## Price Calculation

- **Single operation**: 0.001 USDC
- **2 operations**: 0.0018 USDC (10% discount)
- **3 operations**: 0.0025 USDC (17% discount)
- **4+ operations**: 10% discount per operation

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
# Add to .env file
PERPLEXITY_API_KEY=your_perplexity_api_key
```

3. Run the service agent:
```bash
python x402_service_agent.py
```

4. Run the client agent:
```bash
python x402_client_agent.py
```

## How it Works

1. **Client** sends service request with operations and payment amount
2. **Service Agent** verifies payment amount matches expected price
3. **Service Agent** processes operations (summarize, analyze, upload)
4. **Service Agent** returns results with transaction hash
5. **Client** receives response with results and cost breakdown

## Next Steps

- Integrate with actual Perplexity API
- Add real x402 payment verification
- Connect to Walrus for uploads
- Add more operation types
- Implement proper error handling
