from uagents import Agent, Context, Model
import os
from dotenv import load_dotenv
load_dotenv()

REQUESTER_SEED = os.getenv("REQUESTER_SEED")


# --- Message Models ---
# These models must EXACTLY match the ones in your oracle_agent.py file
# so the agents can understand each other.

class OracleRequest(Model):
    currency: str

class OracleResponse(Model):
    currency: str
    price_usd: float

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

# This function will run every 10 seconds
@requester.on_interval(period=10.0)
async def ask_for_price(ctx: Context):
    # This is the key part:
    # We create an OracleRequest message and set the 'currency' field.
    currency_to_fetch = "bitcoin"
    ctx.logger.info(f"Sending request for the price of {currency_to_fetch}")
    
    await ctx.send(
        ORACLE_AGENT_ADDRESS,
        OracleRequest(currency=currency_to_fetch)
    )

# This function will be triggered when the oracle agent sends back a response
@requester.on_message(model=OracleResponse)
async def handle_oracle_response(ctx: Context, sender: str, msg: OracleResponse):
    ctx.logger.info(f"Received price from {sender}: 1 {msg.currency.upper()} = ${msg.price_usd}")

if __name__ == "__main__":
    requester.run()