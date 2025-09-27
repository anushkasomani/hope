import asyncio
import json
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low

# Message models (same as in x402_service_agent.py)
class ServiceRequest(Model):
    operations: list
    user_address: str
    payment_amount: int

class ServiceResponse(Model):
    success: bool
    results: list
    total_cost: int
    transaction_hash: str = ""

# Create a test client agent
test_client = Agent(
    name="test_client",
    seed="test_client_seed_phrase_here",
    port=8002,  # Different port to avoid conflicts
    endpoint=["http://localhost:8002/submit"],
)

# Service agent address
SERVICE_AGENT_ADDRESS = "agent1qgr26w5uv28m6pckftscktpe6talr9a76jueh268vv89cm8838kvg6nnupu"

@test_client.on_message(ServiceResponse)
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

@test_client.on_interval(period=10.0)
async def send_test_request(ctx: Context):
    """Send test request every 10 seconds"""
    
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
    
    user_address = "0x1234567890123456789012345678901234567890"
    
    print("🚀 Testing x402_service_agent...")
    print(f"📊 Operations: {len(operations)}")
    print(f"💰 Price: {price / 1000000} USDC")
    
    # Create service request
    request = ServiceRequest(
        operations=operations,
        user_address=user_address,
        payment_amount=price
    )
    
    # Send request to service agent
    await ctx.send(SERVICE_AGENT_ADDRESS, request)
    print("📤 Request sent! Waiting for response...")

if __name__ == "__main__":
    print("🧪 Starting test client...")
    print(f"Test Client Address: {test_client.address}")
    print(f"Target Service Agent: {SERVICE_AGENT_ADDRESS}")
    print("🔄 Agent will send test requests every 10 seconds...")
    
    # Run the agent (it will handle sending requests automatically)
    test_client.run()
