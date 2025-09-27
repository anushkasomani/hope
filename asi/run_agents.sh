#!/bin/bash

echo "🚀 Starting x402 Service Agent..."

# Start service agent in background
source venv/bin/activate && python3 x402_service_agent.py &
SERVICE_PID=$!

# Wait a moment for service agent to start
sleep 3

echo "📡 Service agent started with PID: $SERVICE_PID"
echo "🔗 Service agent address will be displayed above"
echo ""
echo "⏳ Starting client agent in 5 seconds..."
echo "   (Copy the service agent address and update x402_client_agent.py)"
echo ""

sleep 5

echo "🚀 Starting x402 Client Agent..."
source venv/bin/activate && python3 x402_client_agent.py &
CLIENT_PID=$!

echo "📡 Client agent started with PID: $CLIENT_PID"
echo ""
echo "✅ Both agents are running!"
echo "   Service Agent PID: $SERVICE_PID"
echo "   Client Agent PID: $CLIENT_PID"
echo ""
echo "Press Ctrl+C to stop both agents"

# Wait for user interrupt
trap "echo '🛑 Stopping agents...'; kill $SERVICE_PID $CLIENT_PID; exit" INT

# Keep script running
wait
