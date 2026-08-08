#!/usr/bin/env python3
"""
Utility to find your PC's local network IP address
Run this on your development PC to get the correct IP for the Expo app
"""
import socket

def get_local_ip():
    """Get the local network IP address (not 127.0.0.1)"""
    try:
        # This connects to Google DNS (doesn't actually send data)
        # and determines which local IP would be used to reach it
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    ip = get_local_ip()
    print(f"Your PC's local network IP address: {ip}")
    print(f"\nUpdate BACKEND_IP in apiClient.ts to: {ip}")
    print(f"Backend URL for Expo app: http://{ip}:8000")
