## How to Fix the Network Error in Expo App

### The Problem
Your Expo app is trying to reach the backend at `127.0.0.1` (device's localhost), but your backend is running on your PC. Requests timeout after 10 seconds and return "Network error."

### The Solution
You need to update `apiClient.ts` with your PC's actual local network IP address.

### Step 1: Find Your PC's IP Address

**On Windows:**
1. Open Command Prompt (Win + R, type `cmd`)
2. Run: `ipconfig`
3. Look for your network adapter and find the **"IPv4 Address"** (typically looks like `192.168.1.XX` or `192.168.0.XX`)
4. Example output:
   ```
   Ethernet adapter Ethernet:
      IPv4 Address . . . . . . . . . . . : 192.168.1.100
   ```

**On Mac/Linux:**
1. Open Terminal
2. Run: `ifconfig` or `ip addr`
3. Look for `inet` address under your active network interface (not 127.0.0.1)
4. Example: `inet 192.168.1.100`

### Step 2: Update apiClient.ts

Open `frontend/src/model/services/apiClient.ts` and change this line:
```typescript
const BACKEND_IP = "192.168.1.100"; // <-- CHANGE THIS to your actual PC IP
```

Replace `192.168.1.100` with the IPv4 address you found in Step 1.

### Step 3: Verify
1. Make sure your backend is running:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
2. The backend should be listening on `http://<YOUR_IP>:8000`
3. Restart your Expo app
4. Try registering again

### Important Notes
- **Do NOT use `127.0.0.1` or `localhost` for Expo mobile/emulator apps** - these point to the device, not your PC
- The web browser testing also works with 127.0.0.1 if you run it on the same PC
- If testing on a different network, make sure the IP is consistent
- Firewall: Make sure Windows Firewall isn't blocking port 8000. You may need to allow uvicorn through the firewall

### Troubleshooting
If requests still fail:
1. **Verify backend is running:** Go to `http://YOUR_IP:8000/health` in your browser (replace YOUR_IP with your actual IP)
2. **Check firewall:** Ensure port 8000 is not blocked
3. **Check network:** Make sure your PC and mobile device/emulator are on the same network
4. **Check the backend logs:** Look for any errors when the request arrives

### Why This Fix Works
- **Web browsers:** 127.0.0.1 correctly points to the PC running the browser
- **Expo mobile/emulator:** 127.0.0.1 incorrectly points to the device itself, so we need the PC's real IP address
- The apiClient now automatically picks the correct address based on the platform
