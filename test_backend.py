#!/usr/bin/env python3
"""Test script to verify backend registration endpoint"""
import sys
import json
import subprocess
import time

# First, ensure dependencies are installed
print("[1] Installing dependencies...")
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q", "fastapi", "uvicorn", "sqlalchemy", "pydantic", "pydantic-settings", "passlib", "python-jose[cryptography]", "requests"],
    cwd="c:\\Users\\Leo\\Desktop\\COMP490-Task-Manger\\backend"
)

import requests

# Start the backend server
print("[2] Starting backend server...")
import os
os.chdir("c:\\Users\\Leo\\Desktop\\COMP490-Task-Manger\\backend")

# Use subprocess to run the backend
backend_process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Wait for the server to start
print("[3] Waiting for server to start...")
time.sleep(5)

# Test the endpoints
print("[4] Testing backend endpoints...")
try:
    # Test health endpoint
    response = requests.get("http://127.0.0.1:8000/health", timeout=5)
    print(f"   Health check: {response.status_code} - {response.json()}")
    
    # Test registration
    test_payload = {
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe123",
        "password": "password123"
    }
    print(f"\n[5] Testing registration with payload:")
    print(f"   {json.dumps(test_payload, indent=2)}")
    
    response = requests.post(
        "http://127.0.0.1:8000/auth/register",
        json=test_payload,
        timeout=5
    )
    print(f"\n   Response Status: {response.status_code}")
    print(f"   Response Body: {response.text}")
    
    if response.status_code == 201:
        print("\n✓ Registration successful!")
    else:
        print(f"\n✗ Registration failed with status {response.status_code}")
        
except requests.exceptions.Timeout:
    print("✗ Request timed out - backend not responding")
except requests.exceptions.ConnectionError as e:
    print(f"✗ Connection error: {e}")
except Exception as e:
    print(f"✗ Error: {e}")
finally:
    print("\n[6] Stopping backend server...")
    backend_process.terminate()
    backend_process.wait(timeout=5)
    print("   Backend stopped.")
