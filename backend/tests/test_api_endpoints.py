import sys
import os
import io
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "CYPH3R"
    assert data["status"] == "online"

def test_dashboard_endpoint():
    response = client.get("/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "metrics" in data
    assert len(data["metrics"]) >= 4
    assert "connections" in data

def test_chat_valid_entity():
    payload = {
        "match_id": "match-1",
        "question": "What are the aliases and personal details?"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["profile_name"] == "Entity Alpha"
    assert "Alpha One" in data["answer"]

def test_chat_invalid_entity():
    payload = {
        "match_id": "nonexistent-entity",
        "question": "Where were they seen?"
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 404
    assert "not found" in response.json()["error"].lower()

def test_chat_empty_question():
    payload = {
        "match_id": "match-1",
        "question": "   "
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 400

def test_search_unsupported_file_extension():
    fake_file = io.BytesIO(b"fake txt content")
    response = client.post(
        "/search",
        files={"file": ("test.txt", fake_file, "text/plain")}
    )
    assert response.status_code == 400
    assert "unsupported file type" in response.json()["error"].lower()

def test_search_corrupt_image():
    corrupt_image = io.BytesIO(b"not a valid image byte stream")
    response = client.post(
        "/search",
        files={"file": ("corrupt.jpg", corrupt_image, "image/jpeg")}
    )
    assert response.status_code == 400
