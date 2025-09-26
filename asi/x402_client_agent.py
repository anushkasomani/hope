import asyncio
import json
import base64
from typing import Dict, Any, List
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Message models
class ServiceRequest(Model):
    operations: List[Dict[str, Any]]
    user_address: str
    payment_amount: int

class ServiceResponse(Model):
    success: bool
    results: List[Dict[str, Any]]
    total_cost: int
    transaction_hash: str = ""

class PaymentVerification(Model):
    payment_payload: str
    user_address: str
    amount: int

# Create the client agent
client_agent = Agent(
    name="x402_client_agent",
    seed="x402_client_agent_seed_phrase_here",
    port=8001,
    endpoint=["http://localhost:8001/submit"],
)

# Service agent address (you'll need to get this from the service agent)
SERVICE_AGENT_ADDRESS = "agent1qgr26w5uv28m6pckftscktpe6talr9a76jueh268vv89cm8838kvg6nnupu"

@client_agent.on_message(ServiceResponse)
async def handle_service_response(ctx: Context, sender: str, msg: ServiceResponse):
    """Handle responses from service agent"""
    
    if msg.success:
        print(f"✅ Service completed successfully!")
        print(f"📊 Results: {msg.results}")
        print(f"💰 Total cost: {msg.total_cost / 1000000} USDC")
        print(f"🔗 Transaction hash: {msg.transaction_hash}")
    else:
        print(f"❌ Service failed")
        print(f"💰 Expected cost: {msg.total_cost / 1000000} USDC")

async def request_service(ctx: Context, operations: List[Dict[str, Any]], user_address: str, payment_amount: int):
    """Request service from the service agent"""
    
    # Create service request
    request = ServiceRequest(
        operations=operations,
        user_address=user_address,
        payment_amount=payment_amount
    )
    
    # Send request to service agent
    await ctx.send(SERVICE_AGENT_ADDRESS, request)

@client_agent.on_interval(period=5.0)
async def send_service_request(ctx: Context):
    """Send service request every 5 seconds"""
    
    # Example operations
    operations = [
        {
            "type": "summarize",
            "text": "This is a sample text to summarize using Perplexity API"
        },
        {
            "type": "analyze", 
            "data": "Sample data for analysis"
        }
    ]
    
    # Calculate price (same logic as service agent)
    base_price = 1000
    if len(operations) == 2:
        price = int(base_price * 1.8)  # 10% discount for 2 operations
    else:
        price = base_price * len(operations)
    
    user_address = "0x1234567890123456789012345678901234567890"  # Replace with actual user address
    
    print(f"🚀 Requesting service with {len(operations)} operations")
    print(f"💰 Price: {price / 1000000} USDC")
    
    # Request service
    await request_service(ctx, operations, user_address, price)

if __name__ == "__main__":
    # Fund the agent if needed
    fund_agent_if_low(client_agent.wallet.address())
    
    print(f"Client Agent Address: {client_agent.address}")
    print(f"Client Agent running on port 8001")
    
    # Run the agent
    client_agent.run()
