#!/usr/bin/env python3
"""
Simple script to get service agent address and update client agent
"""

import subprocess
import sys
import re

def get_service_agent_address():
    """Run service agent and extract its address"""
    try:
        # Run service agent in background and capture output
        process = subprocess.Popen(
            ['python', 'x402_service_agent.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Read first few lines to get address
        for line in process.stdout:
            if "Service Agent Address:" in line:
                address = line.split("Service Agent Address:")[1].strip()
                print(f"Found service agent address: {address}")
                return address
            if "Service Agent running" in line:
                break
        
        process.terminate()
        return None
        
    except Exception as e:
        print(f"Error getting service agent address: {e}")
        return None

def update_client_agent(address):
    """Update client agent with service agent address"""
    try:
        with open('x402_client_agent.py', 'r') as f:
            content = f.read()
        
        # Replace the placeholder address
        updated_content = content.replace(
            'SERVICE_AGENT_ADDRESS = "agent1q..."  # Replace with actual service agent address',
            f'SERVICE_AGENT_ADDRESS = "{address}"'
        )
        
        with open('x402_client_agent.py', 'w') as f:
            f.write(updated_content)
        
        print(f"Updated client agent with address: {address}")
        return True
        
    except Exception as e:
        print(f"Error updating client agent: {e}")
        return False

if __name__ == "__main__":
    print("Getting service agent address...")
    address = get_service_agent_address()
    
    if address:
        print("Updating client agent...")
        if update_client_agent(address):
            print("✅ Client agent updated successfully!")
            print("Now you can run: python x402_client_agent.py")
        else:
            print("❌ Failed to update client agent")
    else:
        print("❌ Failed to get service agent address")
        print("Please run the service agent first and copy its address manually")
