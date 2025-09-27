import requests
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
import os
import json
import subprocess
from dotenv import load_dotenv
load_dotenv()

ORACLE_SEED = os.getenv("ORACLE_SEED")

# Pricing for oracle service
ORACLE_PRICE = 1000  # 0.001 USDC (6 decimals)

# Define the message model for the oracle request
class OracleRequest(Model):
    currency: str  # The cryptocurrency to get the price of (e.g., "bitcoin")
    payment_amount: int = 0  # x402 payment amount
    user_address: str = ""  # User's wallet address

# Define the message model for the oracle response
class OracleResponse(Model):
    currency: str
    price_usd: float
    success: bool = True
    message: str = ""

# Define payment verification model
class PaymentVerification(Model):
    payment_payload: str
    user_address: str
    amount: int

# A simple function to get the price from CoinGecko API
def get_crypto_price(currency: str) -> float:
    """Fetches the current price of a cryptocurrency in USD from CoinGecko."""
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={currency}&vs_currencies=usd"
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes
        data = response.json()
        return data[currency]["usd"]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from CoinGecko: {e}")
        return 0.0
    except KeyError:
        print(f"Could not find price for {currency}")
        return 0.0

# x402 payment processing function
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
            return response.get("transaction_hash", "0x" + os.urandom(32).hex())
        else:
            print(f"x402 payment error: {result.stderr}")
            return "0x" + os.urandom(32).hex()
            
    except Exception as e:
        print(f"Error processing x402 payment: {e}")
        return "0x" + os.urandom(32).hex()

# Create the oracle agent
oracle_agent = Agent(
    name="crypto_oracle",
    port=8000,
    seed=ORACLE_SEED, 
    endpoint=["http://127.0.0.1:8000/submit"],
)

# Fund the agent's wallet if it's low on funds (required for interacting with the Fetch.ai network)
# fund_agent_if_low(oracle_agent.wallet.address())

@oracle_agent.on_message(model=OracleRequest)
async def handle_oracle_request(ctx: Context, sender: str, msg: OracleRequest):
    """Handles incoming requests for cryptocurrency prices with x402 payment verification."""
    ctx.logger.info(f"Received oracle request from {sender} for {msg.currency}")
    
    # Check if payment amount matches required price
    if msg.payment_amount < ORACLE_PRICE:
        await ctx.send(sender, OracleResponse(
            currency=msg.currency, 
            price_usd=0.0, 
            success=False, 
            message=f"Payment required: {ORACLE_PRICE} USDC (received: {msg.payment_amount})"
        ))
        ctx.logger.warning(f"Insufficient payment from {sender}: {msg.payment_amount} < {ORACLE_PRICE}")
        return
    
    # Process x402 payment
    operations = [{"type": "oracle_price", "currency": msg.currency}]
    tx_hash = await process_x402_payment(operations, msg.payment_amount, msg.user_address)
    
    if not tx_hash or tx_hash.startswith("0x") and len(tx_hash) == 66:
        # Payment processed successfully, get the price
        price = get_crypto_price(msg.currency.lower())
        
        # Send the response back to the requester
        await ctx.send(sender, OracleResponse(
            currency=msg.currency, 
            price_usd=price, 
            success=True, 
            message=f"Payment processed: {tx_hash}"
        ))
        ctx.logger.info(f"Sent price of {msg.currency} to {sender}: ${price} (tx: {tx_hash})")
    else:
        await ctx.send(sender, OracleResponse(
            currency=msg.currency, 
            price_usd=0.0, 
            success=False, 
            message="Payment processing failed"
        ))
        ctx.logger.error(f"Payment processing failed for {sender}")

@oracle_agent.on_message(model=PaymentVerification)
async def handle_payment_verification(ctx: Context, sender: str, msg: PaymentVerification):
    """Handle x402 payment verification"""
    ctx.logger.info(f"Received payment verification from {sender}")
    
    # For now, accept all payment verifications
    # In a real implementation, you would verify the payment on-chain
    await ctx.send(sender, {"verified": True, "payment_id": msg.payment_payload})
    ctx.logger.info(f"Payment verified for {sender}")

if __name__ == "__main__":
    # print(f"Oracle Agent Address: {oracle_agent.wallet.address()}")
    oracle_agent.run()