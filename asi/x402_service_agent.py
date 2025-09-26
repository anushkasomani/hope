import asyncio
import json
import base64
from typing import Dict, Any, List
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
# from uagents.network import Network
import httpx
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Price calculation mechanism
class PriceCalculator:
    @staticmethod
    def calculate_price(operations: List[Dict[str, Any]]) -> int:
        """
        Calculate price based on operations:
        - Single operation: base price
        - Multiple operations: discount for bundling
        - Complex operations: higher price
        """
        base_price = 1000  # 0.001 USDC (6 decimals)
        
        if len(operations) == 1:
            return base_price
        elif len(operations) == 2:
            return int(base_price * 1.8)  # 10% discount for 2 operations
        elif len(operations) == 3:
            return int(base_price * 2.5)  # 17% discount for 3 operations
        else:
            return int(base_price * len(operations) * 0.9)  # 10% discount for 4+

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

# Create the service agent
service_agent = Agent(
    name="x402_service_agent",
    seed="x402_service_agent_seed_phrase_here",
    port=8000,
    endpoint=["http://localhost:8000/submit"],
)

# Price calculator instance
price_calc = PriceCalculator()

@service_agent.on_message(ServiceRequest)
async def handle_service_request(ctx: Context, sender: str, msg: ServiceRequest):
    """Handle service requests with x402 payment verification"""
    
    # Calculate expected price
    expected_price = price_calc.calculate_price(msg.operations)
    
    # Verify payment amount matches expected price
    if msg.payment_amount != expected_price:
        await ctx.send(sender, ServiceResponse(
            success=False,
            results=[],
            total_cost=expected_price,
            transaction_hash=""
        ))
        return
    
    # Process operations
    results = []
    for operation in msg.operations:
        result = await process_operation(operation)
        results.append(result)
    
    # Simulate transaction hash (in real implementation, this would be from blockchain)
    tx_hash = f"0x{os.urandom(32).hex()}"
    
    # Send response
    await ctx.send(sender, ServiceResponse(
        success=True,
        results=results,
        total_cost=expected_price,
        transaction_hash=tx_hash
    ))

async def process_operation(operation: Dict[str, Any]) -> Dict[str, Any]:
    """Process individual operations"""
    op_type = operation.get("type", "")
    
    if op_type == "summarize":
        text = operation.get("text", "")
        # Use Perplexity API instead of OpenAI
        summary = await call_perplexity_api(text)
        return {
            "type": "summarize",
            "result": summary,
            "cost": 500  # 0.0005 USDC
        }
    
    elif op_type == "analyze":
        data = operation.get("data", "")
        analysis = await analyze_data(data)
        return {
            "type": "analyze", 
            "result": analysis,
            "cost": 800  # 0.0008 USDC
        }
    
    elif op_type == "upload":
        content = operation.get("content", "")
        upload_result = await upload_to_walrus(content)
        return {
            "type": "upload",
            "result": upload_result,
            "cost": 300  # 0.0003 USDC
        }
    
    else:
        return {
            "type": "unknown",
            "result": "Operation not supported",
            "cost": 0
        }

async def call_perplexity_api(text: str) -> str:
    """Call Perplexity API for summarization"""
    try:
        # This would be your actual Perplexity API call
        # For now, return a mock response
        return f"Summary of: {text[:50]}..."
    except Exception as e:
        return f"Error calling Perplexity API: {str(e)}"

async def analyze_data(data: str) -> str:
    """Analyze data (mock implementation)"""
    return f"Analysis complete for: {data[:30]}..."

async def upload_to_walrus(content: str) -> str:
    """Upload to Walrus (mock implementation)"""
    return f"Uploaded to Walrus: {content[:30]}..."

@service_agent.on_message(PaymentVerification)
async def handle_payment_verification(ctx: Context, sender: str, msg: PaymentVerification):
    """Handle x402 payment verification"""
    
    # Decode payment payload
    try:
        payment_data = json.loads(base64.b64decode(msg.payment_payload).decode())
        
        # Verify payment details
        if payment_data.get("to") != service_agent.address:
            await ctx.send(sender, {"error": "Invalid payment recipient"})
            return
        
        if int(payment_data.get("value", 0)) != msg.amount:
            await ctx.send(sender, {"error": "Payment amount mismatch"})
            return
        
        # Payment verified
        await ctx.send(sender, {"verified": True, "payment_id": payment_data.get("nonce")})
        
    except Exception as e:
        await ctx.send(sender, {"error": f"Payment verification failed: {str(e)}"})

if __name__ == "__main__":
    # Fund the agent if needed
    fund_agent_if_low(service_agent.wallet.address())
    
    print(f"Service Agent Address: {service_agent.address}")
    print(f"Service Agent running on port 8000")
    
    # Run the agent
    service_agent.run()
