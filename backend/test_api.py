import urllib.request
import json
import sys

def test_endpoint(url, method='GET', data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        data_bytes = json.dumps(data).encode('utf-8')
    else:
        data_bytes = None
        
    try:
        with urllib.request.urlopen(req, data=data_bytes) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error calling {url}: {e}")
        return None

def run_tests():
    print("Testing CYPH3R API...")
    
    # Test Root
    root = test_endpoint('http://localhost:8000/')
    if root and root.get('status') == 'online':
        print("[OK] Root endpoint")
    else:
        print("[FAIL] Root endpoint")
        sys.exit(1)
        
    # Test Dashboard
    dash = test_endpoint('http://localhost:8000/dashboard')
    if dash and dash.get('status') == 'online' and 'metrics' in dash:
        print(f"[OK] Dashboard endpoint (Found {len(dash['metrics'])} metrics)")
    else:
        print("[FAIL] Dashboard endpoint")
        sys.exit(1)
        
    # Test Chat
    chat_payload = {
        "match_id": "match-1",
        "question": "what are the aliases?"
    }
    chat = test_endpoint('http://localhost:8000/chat', method='POST', data=chat_payload)
    if chat and 'answer' in chat and 'Entity Alpha' in chat.get('profile_name', ''):
        print("[OK] Chat intel endpoint")
    else:
        print("[FAIL] Chat intel endpoint")
        sys.exit(1)
        
    print("[SUCCESS] All CYPH3R backend API tests passed successfully!")
    sys.exit(0)

if __name__ == '__main__':
    run_tests()
