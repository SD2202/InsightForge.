import requests
import os

BASE_URL = "http://localhost:8000/api"

def test_upload():
    # 1. Login to get token
    print("Logging in...")
    login_data = {"username": "testuser123", "password": "Password123!"}
    
    # Try signup first
    requests.post(f"{BASE_URL}/auth/signup", json={"username": "testuser123", "email": "test@example.com", "password": "Password123!"})
    
    # Login
    resp = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    if resp.status_code != 200:
        print("Login failed:", resp.text)
        return
        
    token = resp.json()["access_token"]
    print("Got token:", token[:10] + "...")
    
    # 2. Upload file
    print("Uploading file...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create dummy CSV
    with open("dummy.csv", "w") as f:
        f.write("id,name\n1,Alice\n2,Bob")
        
    with open("dummy.csv", "rb") as f:
        files = {"file": ("dummy.csv", f, "text/csv")}
        upload_resp = requests.post(f"{BASE_URL}/upload", headers=headers, files=files)
        
    print("Upload status:", upload_resp.status_code)
    print("Upload response:", upload_resp.text)
    
if __name__ == "__main__":
    test_upload()
