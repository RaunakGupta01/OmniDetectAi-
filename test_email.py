#!/usr/bin/env python
"""
Test script to verify the Gmail email sending functionality
"""

import requests
import json

API_BASE = "http://localhost:5000/api"

def test_send_email():
    """Test the /api/send-email endpoint"""
    
    # Sample contact form data
    test_data = {
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1 (555) 123-4567",
        "message": "This is a test message from the OmniDetect AI contact form. Great work on the app!"
    }
    
    print("=" * 60)
    print("Testing OmniDetect AI Contact Form Email Feature")
    print("=" * 60)
    print(f"\n📧 Sending test email with the following data:")
    print(json.dumps(test_data, indent=2))
    print("\n⏳ Sending request to /api/send-email...")
    
    try:
        response = requests.post(
            f"{API_BASE}/send-email",
            json=test_data,
            timeout=10
        )
        
        print(f"\n✓ Response Status: {response.status_code}")
        
        result = response.json()
        print(f"✓ Response: {json.dumps(result, indent=2)}")
        
        if response.ok and result.get("success"):
            print("\n" + "=" * 60)
            print("✓ SUCCESS! Email sent to rggupta01rg@gmail.com")
            print("=" * 60)
            return True
        else:
            print("\n" + "=" * 60)
            print("✗ FAILED! Check error message above")
            print("=" * 60)
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n" + "=" * 60)
        print("✗ ERROR: Cannot connect to Flask backend!")
        print("Make sure 'python app.py' is running on port 5000")
        print("=" * 60)
        return False
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    test_send_email()
