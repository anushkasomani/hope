#!/usr/bin/env python3
"""
REST API server for the Oracle Agent to handle x402 payments.
This bridges the gap between x402 payment processor and uAgents.
"""

import asyncio
import json
import os
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Oracle API Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Oracle service configuration
ORACLE_PRICE = 1000  # 0.001 USDC (6 decimals)
ORACLE_AGENT_URL = "http://127.0.0.1:8000/submit"

class OracleRequest(BaseModel):
    currency: str
    payment_amount: int
    user_address: str

class OracleResponse(BaseModel):
    success: bool
    currency: str
    price_usd: float
    message: str
    transaction_hash: str = ""

def get_crypto_price(currency: str) -> float:
    """Fetches the current price of a cryptocurrency in USD from CoinGecko."""
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={currency}&vs_currencies=usd"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data[currency]["usd"]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from CoinGecko: {e}")
        return 0.0
    except KeyError:
        print(f"Could not find price for {currency}")
        return 0.0

@app.get("/")
async def root():
    return {"message": "Oracle API Server is running", "price": f"{ORACLE_PRICE} USDC"}

@app.get("/oracle/price")
async def get_oracle_info():
    """Get oracle service information"""
    return {
        "service": "Oracle Price Service",
        "price": ORACLE_PRICE,
        "currency": "USDC",
        "endpoints": {
            "POST /oracle/price": "Get cryptocurrency price (requires payment)"
        }
    }

@app.post("/oracle/price")
async def get_price_with_payment(request: OracleRequest):
    """Get cryptocurrency price with x402 payment verification"""
    
    print(f"Received oracle request: {request.currency}, payment: {request.payment_amount}")
    
    # Verify payment amount
    if request.payment_amount < ORACLE_PRICE:
        raise HTTPException(
            status_code=402,  # Payment Required
            detail={
                "success": False,
                "error": f"Payment required: {ORACLE_PRICE} USDC (received: {request.payment_amount})",
                "required_amount": ORACLE_PRICE
            }
        )
    
    # Get the price
    price = get_crypto_price(request.currency.lower())
    
    if price <= 0:
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": f"Could not fetch price for {request.currency}"
            }
        )
    
    # Generate a mock transaction hash for successful payment
    # In a real implementation, this would be the actual blockchain transaction hash
    import hashlib
    import time
    tx_data = f"{request.user_address}{request.payment_amount}{int(time.time())}"
    tx_hash = "0x" + hashlib.sha256(tx_data.encode()).hexdigest()[:64]
    
    return {
        "success": True,
        "currency": request.currency,
        "price_usd": price,
        "message": f"Payment processed successfully for {request.currency}",
        "transaction_hash": tx_hash,
        "payment_amount": request.payment_amount,
        "user_address": request.user_address
    }

@app.post("/premium/summarize")
async def premium_summarize(request: Dict[str, Any]):
    """Fallback endpoint for x402 compatibility"""
    # Extract currency from request if available
    currency = "bitcoin"  # default
    if "body" in request and "currency" in request["body"]:
        currency = request["body"]["currency"]
    
    # Create oracle request
    oracle_request = OracleRequest(
        currency=currency,
        payment_amount=request.get("payment_amount", ORACLE_PRICE),
        user_address=request.get("user_address", "0x0000000000000000000000000000000000000000")
    )
    
    return await get_price_with_payment(oracle_request)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Oracle API Server...")
    print(f"💰 Oracle Price: {ORACLE_PRICE} USDC")
    print("📡 Endpoints:")
    print("   GET  /oracle/price - Service info")
    print("   POST /oracle/price - Get price with payment")
    print("   POST /premium/summarize - x402 compatibility")
    print("🌐 Server: http://localhost:8000")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
