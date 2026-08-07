import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
import ReactDOM from 'react-dom/client';

type Metric = { label: string; value: string; trend: string; color: string };
type EventItem = { time: string; event: string };
type ConnectionItem = { label: string; value: string };
type MatchResult = { id: string; name: string; confidence: string; source: string; summary: string };
type ChatMessage = { role: 'user' | 'assistant'; text: string };
type SearchResult = {
  query: string;
  face_count: number;
  detected_faces: { x: number; y: number; width: number; height: number }[];
  matches: MatchResult[];
};

type DashboardData = {
  status: string;
  metrics: Metric[];
  activity: EventItem[];
  connections: ConnectionItem[];
};

const App = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Digital clock update
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('en-US', { hour12: false }) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/dashboard')
      .then(response => {
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setDashboard(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setSearchResult(null);
    setSelectedMatchId(null);
    setChatMessages([]);
    setSearchError(null);
    setChatError(null);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setImagePreview(null);
    }
  };

  const handleSearch = async () => {
    if (!file) {
      setSearchError('Please select an image file to search.');
      return;
    }

    setSearchResult(null);
    setSearchLoading(true);
    setSearchError(null);
    setChatError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/search', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const data: SearchResult = await response.json();
      setSearchResult(data);
      setSelectedMatchId(data.matches?.[0]?.id ?? null);
      setChatMessages([
        {
          role: 'assistant',
          text: `Search complete. Select a match and ask what intelligence you want about ${data.matches?.[0]?.name ?? 'the candidate'}.`,
        },
      ]);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectedMatch = searchResult?.matches.find(match => match.id === selectedMatchId) ?? null;

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    setChatError(null);
  };

  const handleChatSubmit = async () => {
    if (!selectedMatch) {
      setChatError('Select a match to chat about first.');
      return;
    }

    const text = chatInput.trim();
    if (!text) {
      setChatError('Enter a question or request to continue.');
      return;
    }

    setChatLoading(true);
    setChatError(null);

    const userMessage: ChatMessage = { role: 'user', text };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    try {
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: selectedMatch.id, question: text }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = { role: 'assistant', text: data.answer ?? 'No intelligence response available.' };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setChatError(err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const metrics = dashboard?.metrics ?? [];
  const activity = dashboard?.activity ?? [];
  const connections = dashboard?.connections ?? [];

  return (
    <div style={{ minHeight: '100vh', padding: '24px 36px', position: 'relative' }}>
      
      {/* Decorative tech corners */}
      <div style={{ position: 'fixed', top: 12, left: 12, width: 24, height: 24, borderTop: '2px solid #4f46e5', borderLeft: '2px solid #4f46e5', pointerEvents: 'none' }}></div>
      <div style={{ position: 'fixed', top: 12, right: 12, width: 24, height: 24, borderTop: '2px solid #4f46e5', borderRight: '2px solid #4f46e5', pointerEvents: 'none' }}></div>
      <div style={{ position: 'fixed', bottom: 12, left: 12, width: 24, height: 24, borderBottom: '2px solid #4f46e5', borderLeft: '2px solid #4f46e5', pointerEvents: 'none' }}></div>
      <div style={{ position: 'fixed', bottom: 12, right: 12, width: 24, height: 24, borderBottom: '2px solid #4f46e5', borderRight: '2px solid #4f46e5', pointerEvents: 'none' }}></div>

      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 32, borderBottom: '1px solid rgba(79, 70, 229, 0.2)', paddingBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 900, fontFamily: 'Orbitron, sans-serif', padding: '4px 10px', background: 'rgba(79, 70, 229, 0.2)', color: '#a5b4fc', border: '1px solid rgba(79, 70, 229, 0.4)', borderRadius: 4, letterSpacing: 2 }}>
              SECURE CHANNEL
            </span>
            <span style={{ fontSize: 12, color: '#4b5563', fontFamily: 'Share Tech Mono, monospace' }}>
              SID: {timeStr ? btoa(timeStr).slice(0, 10).toUpperCase() : 'CYPH-MAIN'}
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '2.5rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff 0%, #a5b4fc 60%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 30px rgba(79, 70, 229, 0.2)' }}>
            CYPH3R // NATIONAL INTELLIGENCE
          </h1>
          <p style={{ marginTop: 10, maxWidth: 640, color: '#9ca3af', fontSize: 15, lineHeight: 1.6 }}>
            Real-time biometric signals, open-source exposures, and cross-border entity relationship intelligence. Controlled access protocol active.
          </p>
        </div>

        {/* Info panel */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'right', fontFamily: 'Share Tech Mono, monospace' }}>
            <div style={{ color: '#4f46e5', fontSize: 12, letterSpacing: 1.5, fontWeight: 'bold' }}>SYSTEM TIME</div>
            <div style={{ color: '#fff', fontSize: 20, marginTop: 4, fontWeight: 'bold' }}>{timeStr || '00:00:00 UTC'}</div>
          </div>
          <div style={{ minWidth: 200, padding: '16px 20px', background: 'rgba(10, 11, 22, 0.75)', border: '1px solid rgba(79, 70, 229, 0.25)', borderRadius: 16, backdropFilter: 'blur(8px)', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif' }}>SYSTEM STATUS</span>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>
                <span className="animate-pulse-slow" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} /> ACTIVE
              </span>
            </div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}>Operational</div>
          </div>
        </div>
      </header>

      {/* MAIN TWO-COLUMN SECTION */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 28 }}>
        
        {/* LEFT COLUMN: Face Search & Analysis */}
        <div style={{ padding: 28, borderRadius: 24, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ margin: 0, color: '#818cf8', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>IMAGE BIOMETRICS</p>
              <h2 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Candidate Face Ingestion</h2>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5' }}></div>
          </div>

          {/* File selector input */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <label style={{ display: 'block', padding: '36px 20px', borderRadius: 16, border: '2px dashed rgba(79, 70, 229, 0.3)', background: 'rgba(3, 4, 9, 0.4)', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.3s ease' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
              <span style={{ color: '#fff', fontWeight: 600, display: 'block', marginBottom: 4 }}>Select target facial record</span>
              <span style={{ color: '#6b7280', fontSize: 13 }}>PNG, JPEG formats accepted</span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
            {file && (
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 14 }}>
                <span style={{ color: '#a5b4fc', fontFamily: 'Share Tech Mono, monospace' }}>FILE: {file.name}</span>
                <span style={{ color: '#6b7280' }}>({Math.round(file.size / 1024)} KB)</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleSearch}
            disabled={searchLoading || !file}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              border: 'none',
              background: !file ? 'rgba(79, 70, 229, 0.2)' : 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
              color: !file ? '#6b7280' : '#fff',
              fontWeight: 800,
              fontSize: 15,
              fontFamily: 'Orbitron, sans-serif',
              letterSpacing: 1.5,
              cursor: !file ? 'not-allowed' : 'pointer',
              boxShadow: file ? '0 4px 20px rgba(79, 70, 229, 0.3)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {searchLoading ? 'INITIALIZING RADAR SCAN...' : 'EXECUTE FACE SEARCH'}
          </button>
          {searchError && <p style={{ marginTop: 14, color: '#f43f5e', fontSize: 14, fontFamily: 'Share Tech Mono, monospace' }}>❌ ERROR: {searchError}</p>}

          {/* Image & Scanner Preview */}
          {imagePreview && (
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
              
              {/* Image Frame with Scanning reticle */}
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(79, 70, 229, 0.4)', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                <img src={imagePreview} alt="Target source" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                
                {/* HUD Elements */}
                <div style={{ position: 'absolute', top: 10, left: 10, color: '#818cf8', fontSize: 10, fontFamily: 'Share Tech Mono, monospace', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4 }}>
                  SCAN_TARGET_A
                </div>
                
                {/* Horizontal scan line */}
                <div className="animate-scan" style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'rgba(99, 102, 241, 0.85)', boxShadow: '0 0 12px 2px rgba(99, 102, 241, 0.8)', top: 0 }}></div>
                
                {/* Corner crosshairs */}
                <div style={{ position: 'absolute', top: 8, left: 8, width: 10, height: 10, borderLeft: '2px solid #818cf8', borderTop: '2px solid #818cf8' }}></div>
                <div style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRight: '2px solid #818cf8', borderTop: '2px solid #818cf8' }}></div>
                <div style={{ position: 'absolute', bottom: 8, left: 8, width: 10, height: 10, borderLeft: '2px solid #818cf8', borderBottom: '2px solid #818cf8' }}></div>
                <div style={{ position: 'absolute', bottom: 8, right: 8, width: 10, height: 10, borderRight: '2px solid #818cf8', borderBottom: '2px solid #818cf8' }}></div>
              </div>

              {/* Ingestion status/Telemetry radar */}
              <div style={{ background: 'rgba(3, 4, 9, 0.5)', border: '1px solid rgba(79, 70, 229, 0.15)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {searchLoading ? (
                  <>
                    {/* Animated Radar Circle */}
                    <div style={{ position: 'relative', width: 120, height: 120, borderRadius: '50%', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <div className="animate-radar" style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', borderTop: '2px solid #6366f1', transformOrigin: 'center' }}></div>
                      <div style={{ width: 90, height: 90, borderRadius: '50%', border: '1px dotted rgba(99, 102, 241, 0.2)' }}></div>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 10px #6366f1' }}></div>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'Orbitron, sans-serif', color: '#a5b4fc', fontWeight: 'bold', letterSpacing: 1.5 }}>SCANNING SIGNALS...</span>
                  </>
                ) : searchResult ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '2px solid #10b981', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                      <span style={{ fontSize: 24, color: '#10b981' }}>✓</span>
                    </div>
                    <h4 style={{ margin: 0, fontFamily: 'Orbitron, sans-serif', color: '#fff', fontSize: 15, marginBottom: 8 }}>Ingestion Complete</h4>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>Detected faces: <strong style={{ color: '#a5b4fc' }}>{searchResult.face_count}</strong></p>
                    <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>Matches: <strong style={{ color: '#a5b4fc' }}>{searchResult.matches.length}</strong></p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#4b5563' }}>
                    <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>📡</span>
                    <span style={{ fontSize: 12, fontFamily: 'Share Tech Mono, monospace' }}>Telemetry standby</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Results Match Cards Section */}
          {searchResult && (
            <div style={{ marginTop: 28, borderTop: '1px solid rgba(79, 70, 229, 0.15)', paddingTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold', color: '#818cf8', letterSpacing: 1.5 }}>MATCHES DETECTED</span>
                <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Share Tech Mono, monospace' }}>RANKED BY CONFIDENCE</span>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {searchResult.matches.map(match => {
                  const isSelected = selectedMatchId === match.id;
                  const confidenceVal = parseFloat(match.confidence) || 85.0; // parse e.g. "98.4%"
                  return (
                    <div
                      key={match.id}
                      onClick={() => handleSelectMatch(match.id)}
                      style={{
                        padding: '18px 20px',
                        borderRadius: 16,
                        background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'rgba(3, 4, 9, 0.3)',
                        border: isSelected ? '1px solid #6366f1' : '1px solid rgba(79, 70, 229, 0.15)',
                        boxShadow: isSelected ? '0 0 15px rgba(79, 70, 229, 0.15)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Left indicator bar */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: isSelected ? '#6366f1' : 'transparent' }}></div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Orbitron, sans-serif', color: '#fff' }}>{match.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'Share Tech Mono, monospace' }}>CONFIDENCE</span>
                          <span style={{ color: '#10b981', fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', fontSize: 13 }}>{match.confidence}</span>
                        </div>
                      </div>

                      <p style={{ margin: '8px 0 10px', color: '#9ca3af', fontSize: 14, lineHeight: 1.5 }}>{match.summary}</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#6b7280', fontFamily: 'Share Tech Mono, monospace' }}>
                        <span>SOURCE ID // {match.source.toUpperCase()}</span>
                        {isSelected && <span style={{ color: '#818cf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}><span className="animate-blink">●</span> ACTIVE LINK</span>}
                      </div>

                      {/* Neon progress bar for confidence */}
                      <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
                        <div style={{ width: `${confidenceVal}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #10b981)' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Intelligence Agent & System Manual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Intelligence Chat Terminal */}
          <div style={{ flex: 1, padding: 28, borderRadius: 24, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', minHeight: 480 }}>
            
            {/* Terminal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(79, 70, 229, 0.15)', paddingBottom: 16, marginBottom: 18 }}>
              <div>
                <p style={{ margin: 0, color: '#10b981', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>INTELLIGENCE COMMUNICATOR</p>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.4rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, color: '#fff' }}>
                  {selectedMatch ? `Signal Feed: ${selectedMatch.name}` : 'Awaiting Connection...' }
                </h3>
              </div>
              <span style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 4 }}>
                SECURE AES-256
              </span>
            </div>

            {/* Chat Messages Log */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 18, borderRadius: 16, background: 'rgba(3, 4, 9, 0.6)', border: '1px solid rgba(79, 70, 229, 0.12)', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 260, maxHeight: 360 }}>
              {selectedMatch ? (
                chatMessages.length === 0 ? (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#6b7280', padding: 20 }}>
                    <div>
                      <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>💬</span>
                      <p style={{ margin: 0, fontSize: 14 }}>Connection established with CYPH3R agent.</p>
                      <p style={{ marginTop: 4, fontSize: 13, color: '#4b5563' }}>Query affiliations, public records, geo tracking, or exposure risks.</p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((message, index) => {
                    const isUser = message.role === 'user';
                    return (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                        <span style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', color: isUser ? '#818cf8' : '#10b981', fontSize: 10, fontFamily: 'Share Tech Mono, monospace', marginBottom: 4, letterSpacing: 1 }}>
                          {isUser ? 'LOG // USER' : 'FEED // CYPH3R'}
                        </span>
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 18,
                          background: isUser ? 'rgba(79, 70, 229, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                          border: isUser ? '1px solid rgba(79, 70, 229, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                          color: '#e2e8f0',
                          fontSize: 14,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          boxShadow: isUser ? 'none' : '0 2px 10px rgba(16, 185, 129, 0.05)'
                        }}>
                          {message.text}
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#6b7280', padding: 20 }}>
                  <div>
                    <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>🔒</span>
                    <p style={{ margin: 0, fontSize: 14 }}>Terminal Locked.</p>
                    <p style={{ marginTop: 4, fontSize: 13, color: '#4b5563' }}>Ingest facial records and select a matched candidate to authorize connection.</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <div style={{ marginTop: 18 }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
                  placeholder={selectedMatch ? 'Transmit query parameters (Press Enter)...' : 'Awaiting target select...'}
                  disabled={!selectedMatch || chatLoading}
                  rows={3}
                  style={{
                    width: '100%',
                    resize: 'none',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1px solid rgba(79, 70, 229, 0.25)',
                    background: 'rgba(3, 4, 9, 0.5)',
                    color: '#fff',
                    outline: 'none',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 14,
                    lineHeight: 1.5,
                    transition: 'all 0.3s ease',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(79, 70, 229, 0.25)'}
                />
              </div>
              
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {chatError ? (
                  <span style={{ color: '#f43f5e', fontSize: 12, fontFamily: 'Share Tech Mono, monospace' }}>⚠️ {chatError}</span>
                ) : (
                  <span style={{ color: '#4b5563', fontSize: 12, fontFamily: 'Share Tech Mono, monospace' }}>NODE: SYSTEM_RELAY_WEST</span>
                )}
                
                <button
                  onClick={handleChatSubmit}
                  disabled={!selectedMatch || chatLoading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 10,
                    border: 'none',
                    background: !selectedMatch ? 'rgba(79, 70, 229, 0.1)' : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    color: !selectedMatch ? '#6b7280' : '#fff',
                    fontWeight: 800,
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: 11,
                    letterSpacing: 1.2,
                    cursor: !selectedMatch ? 'not-allowed' : 'pointer',
                    boxShadow: selectedMatch ? '0 2px 12px rgba(16, 185, 129, 0.2)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {chatLoading ? 'TRANSMITTING...' : 'SEND MESSAGE'}
                </button>
              </div>
            </div>

          </div>

          {/* Standard Operating Manual */}
          <div style={{ padding: 24, borderRadius: 24, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)' }}>
            <p style={{ margin: 0, color: '#818cf8', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>OPERATIONAL SOP</p>
            <h3 style={{ margin: '6px 0 14px', fontSize: '1.25rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Search Sequence Instruction</h3>
            
            <div style={{ display: 'grid', gap: 12, fontSize: 14, color: '#9ca3af', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', color: '#6366f1', fontWeight: 'bold' }}>[01]</span>
                <p>Upload a high-fidelity candidate photograph (JPG/PNG).</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', color: '#6366f1', fontWeight: 'bold' }}>[02]</span>
                <p>Commit query via <strong>EXECUTE FACE SEARCH</strong> to match target database prints.</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', color: '#6366f1', fontWeight: 'bold' }}>[03]</span>
                <p>Select matched candidate cards to initialize secure satellite database links.</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', color: '#6366f1', fontWeight: 'bold' }}>[04]</span>
                <p>Utilize the chat interface to query specific public exposure profiles or geographical markers.</p>
              </div>
            </div>
            
            <p style={{ marginTop: 18, color: '#6b7280', fontSize: 12, fontFamily: 'Share Tech Mono, monospace', borderTop: '1px solid rgba(79, 70, 229, 0.1)', paddingTop: 14 }}>
              RESTRICTED FOR AUTHORIZED MISSION COMMAND PERSONNEL ONLY. ALL SESSIONS LOGGED.
            </p>
          </div>

        </div>

      </section>

      {/* METRICS SECTION */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20, marginBottom: 28 }}>
        {metrics.map(metric => (
          <div key={metric.label} style={{ padding: '22px 24px', borderRadius: 20, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}>
            {/* Tech corner decoration */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRight: '2px solid rgba(79, 70, 229, 0.3)', borderTop: '2px solid rgba(79, 70, 229, 0.3)' }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.1 }}>{metric.label}</p>
              <span style={{ color: metric.color, fontWeight: 'bold', fontFamily: 'Share Tech Mono, monospace', fontSize: 12 }}>{metric.trend}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 10px rgba(255,255,255,0.05)' }}>{metric.value}</div>
          </div>
        ))}
      </section>

      {/* LOWER DETAILS (Exposure map & side info panels) */}
      <main style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24 }}>
        
        {/* Left Side: Map / Signal Intensity visualizer */}
        <section style={{ display: 'grid', gap: 24 }}>
          
          {/* Signal Heatmap card */}
          <div style={{ padding: 28, borderRadius: 24, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, color: '#818cf8', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>EXPOSURE HEATMAP</p>
                <h2 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Global signal intensity overview</h2>
              </div>
              <button style={{ padding: '8px 18px', borderRadius: 999, border: '1px solid rgba(79, 70, 229, 0.3)', background: 'rgba(79, 70, 229, 0.1)', color: '#a5b4fc', fontSize: 12, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1, cursor: 'pointer', transition: 'all 0.3s ease' }}>
                SYNC SIGNAL
              </button>
            </div>
            
            {/* Interactive/Cool Map visualizer placeholder */}
            <div style={{ height: 260, borderRadius: 16, border: '1px dashed rgba(79, 70, 229, 0.25)', background: 'rgba(3, 4, 9, 0.4)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '40%', left: '30%', width: 8, height: 8, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 10px 4px #f43f5e' }}></div>
              <div className="animate-pulse-slow" style={{ position: 'absolute', top: '40%', left: '30%', width: 24, height: 24, borderRadius: '50%', border: '1px solid #f43f5e', transform: 'translate(-8px, -8px)' }}></div>
              
              <div style={{ position: 'absolute', top: '55%', left: '60%', width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px 4px #10b981' }}></div>
              
              <div style={{ position: 'absolute', top: '25%', left: '75%', width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px 4px #3b82f6' }}></div>
              
              <div style={{ textAlign: 'center', zIndex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontFamily: 'Orbitron, sans-serif', color: '#a5b4fc', marginBottom: 4, letterSpacing: 1 }}>CONNECTED TELEMETRY FEED</span>
                <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'Share Tech Mono, monospace' }}>LATENCY: 42ms // STABLE SIGNAL TRACE</span>
              </div>
            </div>
          </div>

          {/* Sub Panels (Entity Graph & Exposure Trends) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            
            <div style={{ padding: 24, borderRadius: 20, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)' }}>
              <p style={{ margin: 0, color: '#818cf8', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>ENTITY RELATIONSHIPS</p>
              <h3 style={{ margin: '4px 0 16px', fontSize: '1.25rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Signal Topology Graph</h3>
              
              <div style={{ height: 180, borderRadius: 16, background: 'rgba(3, 4, 9, 0.4)', border: '1px solid rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {/* Simulated connection lines overlay */}
                <div style={{ position: 'absolute', width: 1, height: '60%', background: 'rgba(99, 102, 241, 0.3)', transform: 'rotate(45deg)' }}></div>
                <div style={{ position: 'absolute', width: 1, height: '50%', background: 'rgba(99, 102, 241, 0.2)', transform: 'rotate(-30deg)' }}></div>
                
                <div style={{ position: 'absolute', top: '30%', left: '35%', width: 28, height: 28, borderRadius: '50%', background: '#4f46e5', border: '2px solid #a5b4fc', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 'bold' }}>T1</div>
                <div style={{ position: 'absolute', bottom: '25%', right: '35%', width: 28, height: 28, borderRadius: '50%', background: '#111827', border: '2px solid #6b7280', display: 'grid', placeItems: 'center', fontSize: 9, color: '#6b7280' }}>C2</div>
                
                <span style={{ fontSize: 12, color: '#4b5563', fontFamily: 'Share Tech Mono, monospace', zIndex: 1 }}>NETWORK VIEW STANDBY</span>
              </div>
            </div>

            <div style={{ padding: 24, borderRadius: 20, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)' }}>
              <p style={{ margin: 0, color: '#818cf8', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>EXPOSURE METRICS</p>
              <h3 style={{ margin: '4px 0 16px', fontSize: '1.25rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Signal Intensities</h3>
              
              <div style={{ height: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
                {connections.map(connection => (
                  <div key={connection.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 8 }}>
                    <span style={{ fontSize: 14, color: '#9ca3af', fontFamily: 'Outfit, sans-serif' }}>{connection.label}</span>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Share Tech Mono, monospace', fontSize: 15 }}>{connection.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Right Side: Operations log & Activity log */}
        <aside style={{ display: 'grid', gap: 24, contentFit: 'start' }}>
          
          {/* Mission Impact block */}
          <div style={{ padding: 26, borderRadius: 24, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)' }}>
            <p style={{ margin: 0, color: '#818cf8', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>SYSTEM METRICS</p>
            <h2 style={{ margin: '4px 0 18px', fontSize: '1.4rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Mission Impact</h2>
            
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 18, borderRadius: 16, background: 'rgba(3, 4, 9, 0.4)', border: '1px solid rgba(79, 70, 229, 0.12)' }}>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 11, fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>DETECTION EVENTS</p>
                <div style={{ marginTop: 6, fontSize: '1.8rem', fontWeight: 900, color: '#fff', fontFamily: 'Orbitron, sans-serif' }}>312</div>
                <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: 13 }}>New public exposure signals cataloged</p>
              </div>
              <div style={{ padding: 18, borderRadius: 16, background: 'rgba(3, 4, 9, 0.4)', border: '1px solid rgba(79, 70, 229, 0.12)' }}>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 11, fontFamily: 'Orbitron, sans-serif', fontWeight: 'bold' }}>INCIDENT QUEUE</p>
                <div style={{ marginTop: 6, fontSize: '1.8rem', fontWeight: 900, color: '#f43f5e', fontFamily: 'Orbitron, sans-serif' }}>18</div>
                <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: 13 }}>Critical nodes prioritized for audit</p>
              </div>
            </div>
          </div>

          {/* Activity Log terminal console */}
          <div style={{ padding: 26, borderRadius: 24, background: 'rgba(10, 11, 22, 0.65)', border: '1px solid rgba(79, 70, 229, 0.2)', backdropFilter: 'blur(10px)' }}>
            <p style={{ margin: 0, color: '#818cf8', fontSize: 11, fontWeight: 'bold', fontFamily: 'Orbitron, sans-serif', letterSpacing: 1.5 }}>CONSOLE FEED</p>
            <h3 style={{ margin: '4px 0 16px', fontSize: '1.25rem', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>Activity logs</h3>
            
            <div style={{ display: 'grid', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
              {activity.map((item, index) => (
                <div key={index} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(3, 4, 9, 0.4)', border: '1px solid rgba(79, 70, 229, 0.08)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#818cf8', fontFamily: 'Share Tech Mono, monospace', fontSize: 11, marginBottom: 4 }}>
                    <span>TIMESTAMP</span>
                    <span>{item.time}</span>
                  </div>
                  <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.4 }}>{item.event}</p>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </main>

    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
