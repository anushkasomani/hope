#!/usr/bin/env python3
"""
Test script to verify x402 + uAgent integration
"""

import asyncio
import json
import subprocess
import os
import sys

async def test_x402_integration():
    """Test the x402 payment processor"""
    
    # Test data
    test_request = {
        "operations": [
            {
                "type": "summarize",
                "text": "This is a test text for summarization"
            },
            {
                "type": "analyze",
                "data": "Test data for analysis"
            }
        ],
        "user_address": "0xCA3953e536bDA86D1F152eEfA8aC7b0C82b6eC00",  # Use actual key address
        "payment_amount": 1800,  # 0.0018 USDC
        "service_url": "http://localhost:5403",
        "endpoint": "/premium/summarize",
        "method": "POST",
        "body": {"text": "This is a test text for summarization"}
    }
    
    print("🧪 Testing x402 payment processor...")
    print(f"Request: {json.dumps(test_request, indent=2)}")
    
    try:
        # Call the payment processor
        result = subprocess.run([
            "node", 
            "x402_payment_processor.js"
        ], 
        input=json.dumps(test_request),
        text=True,
        capture_output=True,
        cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        print(f"Return code: {result.returncode}")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        
        if result.returncode == 0:
            response = json.loads(result.stdout)
            print(f"✅ Payment processed successfully!")
            print(f"Transaction hash: {response.get('transaction_hash')}")
            print(f"Success: {response.get('success')}")
            return True
        else:
            print(f"❌ Payment processor failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing integration: {e}")
        return False

async def main():
    print("🚀 Testing x402 + uAgent Integration")
    print("=" * 50)
    
    # Check if required services are running
    print("🔍 Checking if x402 services are running...")
    
    try:
        import requests
        response = requests.get("http://localhost:5401/healthz", timeout=5)
        if response.status_code == 200:
            print("✅ Facilitator is running")
        else:
            print("❌ Facilitator not responding")
            return
    except:
        print("❌ Facilitator not running. Please start x402 demo first:")
        print("   cd ../demo && bash scripts/start-all.sh")
        return
    
    # Test the integration
    success = await test_x402_integration()
    
    if success:
        print("\n🎉 Integration test passed!")
        print("You can now run: ./start_integrated_demo.sh")
    else:
        print("\n💥 Integration test failed!")
        print("Check the error messages above")

if __name__ == "__main__":
    asyncio.run(main())
