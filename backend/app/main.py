import cv2
import numpy as np
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="CYPH3R API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

class ChatRequest(BaseModel):
    match_id: str
    question: str

match_profiles = {
    "match-1": {
        "name": "Entity Alpha",
        "aliases": ["Alpha One", "A. Ryder"],
        "age": "Mid 30s",
        "country": "United States",
        "last_seen": "Houston, TX",
        "locations": "Houston, TX; Dallas, TX; Miami, FL",
        "affiliations": "Private tech contractor with shadow finance ties and social media infrastructure access.",
        "exposure": "High exposure through leaked photo sets, public filings, and multiple open social profiles.",
        "source": "Public profile",
        "summary": "High similarity detected between the uploaded face and open-source profile imagery.",
        "confidence": "92%"
    },
    "match-2": {
        "name": "Entity Bravo",
        "aliases": ["B. Soto", "Bravo"],
        "age": "Early 40s",
        "country": "Canada",
        "last_seen": "Toronto, ON",
        "locations": "Toronto, ON; Vancouver, BC",
        "affiliations": "Media consultant with links to several public-facing accounts and event appearances.",
        "exposure": "Moderate exposure due to press images and online professional activity.",
        "source": "Public media",
        "summary": "Potential match from similar facial structure and image metadata clustering.",
        "confidence": "78%"
    }
}

@app.get("/")
def read_root():
    return {
        "project": "CYPH3R",
        "message": "Digital footprint intelligence platform",
        "status": "online"
    }

@app.get("/dashboard")
def read_dashboard():
    return {
        "status": "online",
        "metrics": [
            {"label": "Exposure Score", "value": "87", "trend": "HIGH", "color": "#9f7aea"},
            {"label": "Entities", "value": "1248", "trend": "UP", "color": "#38bdf8"},
            {"label": "Alerts", "value": "42", "trend": "CRITICAL", "color": "#fb7185"},
            {"label": "Sources", "value": "98", "trend": "ACTIVE", "color": "#34d399"}
        ],
        "activity": [
            {"time": "09:12", "event": "New image cluster discovered"},
            {"time": "10:05", "event": "Profile association updated"},
            {"time": "11:28", "event": "National exposure alert raised"},
            {"time": "12:46", "event": "Target entity mapped to infrastructure"}
        ],
        "connections": [
            {"label": "Social", "value": "54%"},
            {"label": "Web", "value": "28%"},
            {"label": "Press", "value": "13%"},
            {"label": "Other", "value": "5%"}
        ]
    }

@app.post("/search")
def search_face(file: UploadFile = File(...)):
    filename = file.filename
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        return JSONResponse(status_code=400, content={"error": "Unsupported file type"})

    contents = file.file.read()
    try:
        np_arr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Unable to decode image"})

    if image is None:
        return JSONResponse(status_code=400, content={"error": "Unable to decode image"})

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

    if len(faces) == 0:
        return JSONResponse(status_code=400, content={"error": "No faces detected in the uploaded image"})

    detected_faces = [
        {"x": int(x), "y": int(y), "width": int(w), "height": int(h)}
        for (x, y, w, h) in faces
    ]

    matches = [
        {
            "id": "match-1",
            "name": "Entity Alpha",
            "confidence": "92%",
            "source": "Public profile",
            "summary": match_profiles["match-1"]["summary"]
        },
        {
            "id": "match-2",
            "name": "Entity Bravo",
            "confidence": "78%",
            "source": "Public media",
            "summary": match_profiles["match-2"]["summary"]
        }
    ]

    return {
        "query": filename,
        "face_count": len(faces),
        "detected_faces": detected_faces,
        "matches": matches
    }

@app.post("/chat")
def chat_intel(request: ChatRequest):
    profile = match_profiles.get(request.match_id)
    if not profile:
        return JSONResponse(status_code=404, content={"error": "Match not found"})

    question = request.question.strip()
    if not question:
        return JSONResponse(status_code=400, content={"error": "Question cannot be empty"})

    query = question.lower()
    if any(term in query for term in ["personal", "details", "identity", "name", "age", "alias", "aliases"]):
        answer = (
            f"Name: {profile['name']}\n"
            f"Aliases: {', '.join(profile['aliases'])}\n"
            f"Estimated age: {profile['age']}\n"
            f"Country: {profile['country']}\n"
            f"Last seen: {profile['last_seen']}"
        )
    elif any(term in query for term in ["affiliation", "organization", "group", "network", "linked", "connection"]):
        answer = (
            f"Affiliations: {profile['affiliations']}\n"
            f"Source confidence: {profile['confidence']}\n"
            f"Geographic footprint: {profile['locations']}"
        )
    elif any(term in query for term in ["exposure", "risk", "exposed", "leak", "compromise", "public"]):
        answer = (
            f"Exposure summary: {profile['exposure']}\n"
            f"Public source: {profile['source']}\n"
            "Recommendation: validate open-source identifiers before action."
        )
    elif any(term in query for term in ["location", "where", "city", "country", "travel"]):
        answer = (
            f"Known locations: {profile['locations']}\n"
            f"Last verified presence: {profile['last_seen']}\n"
            "Note: location details are based on publicly available imagery and may not be current."
        )
    else:
        answer = (
            "General intelligence: this entity matches a high-confidence profile. "
            "Ask for specific intel such as personal details, affiliations, exposure, or recent activity."
        )

    return {
        "match_id": request.match_id,
        "profile_name": profile["name"],
        "answer": answer
    }
