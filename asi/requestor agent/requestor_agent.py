from uagents import Agent, Context, Model
import os
import json
import subprocess
from dotenv import load_dotenv
load_dotenv()

REQUESTER_SEED = os.getenv("REQUESTER_SEED")

# Oracle service pricing
ORACLE_PRICE = 1000  # 0.001 USDC (6 decimals)

# --- Message Models ---
# These models must EXACTLY match the ones in your oracle_agent.py file
# so the agents can understand each other.

class OracleRequest(Model):
    currency: str
    payment_amount: int = 0
    user_address: str = ""

class OracleResponse(Model):
    currency: str
    price_usd: float
    success: bool = True
    message: str = ""

class PaymentVerification(Model):
    payment_payload: str
    user_address: str
    amount: int

# --- Payment Processing ---

async def process_x402_payment(operations: list, payment_amount: int, user_address: str) -> str:
    """Process x402 payment using the payment processor"""
    try:
        # Prepare the request payload
        request_data = {
            "operations": operations,
            "user_address": user_address,
            "payment_amount": payment_amount,
            "service_url": "http://localhost:8000",  # Oracle service URL
            "endpoint": "/oracle/price",
            "method": "POST",
            "body": {"currency": operations[0].get("currency", "bitcoin") if operations else "bitcoin"}
        }
        
        # Call the x402 payment processor
        result = subprocess.run([
            "node", 
            "../x402_payment_processor.js"
        ], 
        input=json.dumps(request_data),
        text=True,
        capture_output=True,
        cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode == 0:
            response = json.loads(result.stdout)
            # Only return transaction hash if payment was actually successful
            if response.get("success", False):
                return response.get("transaction_hash", "")
            else:
                print(f"Payment failed: {response.get('error', 'Unknown error')}")
                return ""
        else:
            print(f"x402 payment error: {result.stderr}")
            return ""
            
    except Exception as e:
        print(f"Error processing x402 payment: {e}")
        return ""

# --- Client Agent ---

# The address of the oracle agent we want to query.
# You will get this address from the terminal output when you run oracle_agent.py
ORACLE_AGENT_ADDRESS = "agent1qw0zqnxe3scgpfwlw3zhm8y7crwrgusmyeq732hyrrkpeuqhmhuyw3sd6dk" # <-- PASTE THE ORACLE AGENT'S ADDRESS HERE

# Create the client agent
requester = Agent(
    name="price_requester",
    port=8001,
    seed=REQUESTER_SEED,
    endpoint=["http://127.0.0.1:8001/submit"],
)

# This function will run every 30 seconds (increased interval for payment processing)
@requester.on_interval(period=30.0)
async def ask_for_price(ctx: Context):
    currency_to_fetch = "bitcoin"
    user_address = "0x1234567890123456789012345678901234567890"  # Mock user address
    
    ctx.logger.info(f"Preparing to request price for {currency_to_fetch} with payment")
    
    # Process x402 payment first
    operations = [{"type": "oracle_price", "currency": currency_to_fetch}]
    tx_hash = await process_x402_payment(operations, ORACLE_PRICE, user_address)
    
    if tx_hash and tx_hash.startswith("0x") and len(tx_hash) == 66:
        ctx.logger.info(f"✅ Payment processed successfully: {tx_hash}")
        
        # Send request with payment info
        await ctx.send(
            ORACLE_AGENT_ADDRESS,
            OracleRequest(
                currency=currency_to_fetch,
                payment_amount=ORACLE_PRICE,
                user_address=user_address
            )
        )
        ctx.logger.info(f"Sent paid request for {currency_to_fetch} to oracle")
    else:
        ctx.logger.error(f"❌ Payment failed - no valid transaction hash received, skipping request for {currency_to_fetch}")

# This function will be triggered when the oracle agent sends back a response
@requester.on_message(model=OracleResponse)
async def handle_oracle_response(ctx: Context, sender: str, msg: OracleResponse):
    if msg.success:
        ctx.logger.info(f"✅ Received price from {sender}: 1 {msg.currency.upper()} = ${msg.price_usd}")
        ctx.logger.info(f"Payment info: {msg.message}")
    else:
        ctx.logger.error(f"❌ Oracle request failed: {msg.message}")

# Handle payment verification responses
class PaymentResponse(Model):
    verified: bool = False
    payment_id: str = ""
    error: str = ""

@requester.on_message(model=PaymentResponse)
async def handle_payment_verification(ctx: Context, sender: str, msg: PaymentResponse):
    if msg.verified:
        ctx.logger.info(f"Payment verified: {msg.payment_id}")
    else:
        ctx.logger.error(f"Payment verification failed: {msg.error}")

if __name__ == "__main__":
    requester.run()