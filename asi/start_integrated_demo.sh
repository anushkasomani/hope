#!/bin/bash

echo "🚀 Starting Integrated x402 + uAgent Demo..."

# Kill any existing processes
pkill -f x402 2>/dev/null || true
pkill -f "python.*service_agent" 2>/dev/null || true
pkill -f "python.*client_agent" 2>/dev/null || true

# Wait a moment
sleep 2

echo "📦 Building TypeScript packages..."
cd ../demo
bash scripts/start-all.sh &
DEMO_PID=$!

# Wait for demo services to start
echo "⏳ Waiting for x402 services to start..."
sleep 10

echo "🤖 Starting uAgent services..."
cd ../asi
source venv/bin/activate

# Start service agent
python3 x402_service_agent.py &
SERVICE_PID=$!

# Wait for service agent to start
sleep 3

# Start client agent
python3 x402_client_agent.py &
CLIENT_PID=$!

echo "✅ All services running!"
echo "   x402 Demo PID: $DEMO_PID"
echo "   Service Agent PID: $SERVICE_PID" 
echo "   Client Agent PID: $CLIENT_PID"
echo ""
echo "🔗 Service URLs:"
echo "   Facilitator: http://localhost:5401"
echo "   Resource Server: http://localhost:5403"
echo "   Service Agent: http://localhost:8000"
echo "   Client Agent: http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo "🛑 Stopping all services..."
    kill $DEMO_PID $SERVICE_PID $CLIENT_PID 2>/dev/null || true
    pkill -f x402 2>/dev/null || true
    pkill -f "python.*service_agent" 2>/dev/null || true
    pkill -f "python.*client_agent" 2>/dev/null || true
    exit
}

trap cleanup INT

# Keep script running
wait

