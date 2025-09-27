import requests
from uagents import Agent, Context, Model
from uagents.setup import fund_agent_if_low
import os
from dotenv import load_dotenv
load_dotenv()

ORACLE_SEED = os.getenv("ORACLE_SEED")


# Define the message model for the oracle request
class OracleRequest(Model):
    currency: str  # The cryptocurrency to get the price of (e.g., "bitcoin")

# Define the message model for the oracle response
class OracleResponse(Model):
    currency: str
    price_usd: float

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

# Create the oracle agent
oracle_agent = Agent(
    name="crypto_oracle",
    port=8000,
    seed=ORACLE_SEED, 
    endpoint=["http://127.0.0.1:8000/submit"],
)

# Fund the agent's wallet if it's low on funds (required for interacting with the Fetch.ai network)
fund_agent_if_low(oracle_agent.wallet.address())

@oracle_agent.on_message(model=OracleRequest)
async def handle_oracle_request(ctx: Context, sender: str, msg: OracleRequest):
    """Handles incoming requests for cryptocurrency prices."""
    ctx.logger.info(f"Received oracle request from {sender} for {msg.currency}")

    # Get the price
    price = get_crypto_price(msg.currency.lower())

    # Send the response back to the requester
    await ctx.send(sender, OracleResponse(currency=msg.currency, price_usd=price))
    ctx.logger.info(f"Sent price of {msg.currency} to {sender}: ${price}")

if __name__ == "__main__":
    print(f"Oracle Agent Address: {oracle_agent.wallet.address()}")
    oracle_agent.run()