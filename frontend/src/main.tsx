import React, { useEffect, useState, ChangeEvent } from 'react';
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
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

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
  };

  const handleSearch = async () => {
    if (!file) {
      setSearchError('Please select an image file to search.');
      return;
    }

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
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: '#06070f', color: '#e5e7eb', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
        <div>
          <span style={{ display: 'inline-block', marginBottom: 12, padding: '6px 14px', background: '#111827', borderRadius: 999, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#9ca3af' }}>
            CYPH3R Dashboard
          </span>
          <h1 style={{ margin: 0, fontSize: '3rem', lineHeight: 1.05, letterSpacing: '-0.03em' }}>National Intelligence Command</h1>
          <p style={{ marginTop: 14, maxWidth: 620, color: '#9ca3af', lineHeight: 1.8 }}>
            Real-time visibility into open-source exposures, face intelligence signals, and cross-border entity relationships across publicly available data.
          </p>
        </div>

        <div style={{ minWidth: 220, padding: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid #111827', borderRadius: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>SYSTEM STATUS</span>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: '#34d399' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} /> Online
            </span>
          </div>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>Operational</div>
          <div style={{ marginTop: 12, color: '#9ca3af', fontSize: 14 }}>Backend, ingestion, and analytics pipeline active.</div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 24 }}>
        <div style={{ padding: 24, borderRadius: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid #111827' }}>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Face Search</p>
          <h2 style={{ margin: '12px 0 18px', fontSize: '1.75rem' }}>Upload a photo to search for matches</h2>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleFileChange}
            style={{ width: '100%', padding: '14px 12px', borderRadius: 16, background: '#0f172a', border: '1px solid #1e293b', color: '#fff', marginBottom: 16 }}
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 16, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            {searchLoading ? 'Searching…' : 'Search Faces'}
          </button>
          {searchError && <p style={{ marginTop: 14, color: '#fb7185' }}>{searchError}</p>}

          {searchResult && (
            <div style={{ marginTop: 24, padding: 20, borderRadius: 20, background: '#0f172a', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Search Results</p>
                  <h3 style={{ margin: '12px 0 0', fontSize: '1.35rem' }}>Matches for {searchResult.query}</h3>
                </div>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>
                  Detected faces: <strong>{searchResult.face_count}</strong>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'grid', gap: 14 }}>
                {searchResult.matches.map(match => (
                  <div
                    key={match.id}
                    onClick={() => handleSelectMatch(match.id)}
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: selectedMatchId === match.id ? '#1f2937' : '#111827',
                      border: selectedMatchId === match.id ? '1px solid #4f46e5' : '1px solid #1e293b',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem' }}>{match.name}</h4>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>{match.confidence}</span>
                    </div>
                    <p style={{ margin: '10px 0 0', color: '#9ca3af', fontSize: 14 }}>{match.summary}</p>
                    <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>Source: {match.source}</p>
                    <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>Click to start chat intelligence.</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24, padding: 20, borderRadius: 20, background: '#111827', border: '1px solid #1e293b' }}>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Intelligence Chat</p>
                <h3 style={{ margin: '12px 0 12px', fontSize: '1.4rem' }}>
                  {selectedMatch ? `CYPH3R Chat - ${selectedMatch.name}` : 'Select a match to start the conversation' }
                </h3>
                <div style={{ minHeight: 220, maxHeight: 320, overflowY: 'auto', padding: 16, borderRadius: 18, background: '#0b1120', border: '1px solid #1e293b' }}>
                  {selectedMatch ? (
                    chatMessages.length === 0 ? (
                      <p style={{ margin: 0, color: '#9ca3af' }}>Ask CYPH3R for personal details, affiliation intelligence, exposure risk, or geographic notes.</p>
                    ) : (
                      chatMessages.map((message, index) => (
                        <div key={index} style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ color: message.role === 'user' ? '#a5b4fc' : '#34d399', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1 }}>
                            {message.role === 'user' ? 'You' : 'CYPH3R'}
                          </span>
                          <div style={{ padding: 14, borderRadius: 18, background: message.role === 'user' ? '#111827' : '#0f172a', color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                            {message.text}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    <p style={{ margin: 0, color: '#9ca3af' }}>Pick one of the detected matches to open the chat assistant.</p>
                  )}
                </div>
                <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={selectedMatch ? 'Ask about personal details, affiliations, location, or exposure...' : 'Select a match first to chat.'}
                    disabled={!selectedMatch}
                    rows={4}
                    style={{ width: '100%', resize: 'vertical', padding: 14, borderRadius: 18, border: '1px solid #1e293b', background: '#0f172a', color: '#fff' }}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={!selectedMatch || chatLoading}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 16, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, cursor: selectedMatch ? 'pointer' : 'not-allowed' }}
                  >
                    {chatLoading ? 'Sending…' : 'Send to CYPH3R'}
                  </button>
                  {chatError && <p style={{ margin: 0, color: '#fb7185' }}>{chatError}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: 24, borderRadius: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid #111827' }}>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Instructions</p>
          <h3 style={{ margin: '12px 0 0', fontSize: '1.35rem' }}>How to use face search</h3>
          <ul style={{ marginTop: 16, paddingLeft: 18, color: '#9ca3af', lineHeight: 1.7 }}>
            <li>Select a clear face image in JPEG or PNG format.</li>
            <li>Click <strong>Search Faces</strong> to submit the photo to CYPH3R.</li>
            <li>Review the returned matches and confidence scores.</li>
            <li>Click a match card, then ask CYPH3R for personal details, affiliations, exposures, or location intelligence.</li>
          </ul>
          <p style={{ marginTop: 18, color: '#6b7280', fontSize: 13 }}>
            Note: This prototype uses mock intelligence results. A production-grade system would integrate a secure knowledge graph and entity profiling engine.
          </p>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18, marginBottom: 24 }}>
        {metrics.map(metric => (
          <div key={metric.label} style={{ padding: 22, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid #111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1 }}>{metric.label}</p>
              <span style={{ color: metric.color, fontWeight: 700 }}>{metric.trend}</span>
            </div>
            <div style={{ fontSize: 38, fontWeight: 700, color: '#fff' }}>{metric.value}</div>
          </div>
        ))}
      </section>

      <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <section style={{ display: 'grid', gap: 18 }}>
          <div style={{ padding: 24, borderRadius: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid #111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Exposure Heatmap</p>
                <h2 style={{ margin: '12px 0 0', fontSize: '1.75rem' }}>Global signal overview</h2>
              </div>
              <button style={{ padding: '10px 16px', borderRadius: 999, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' }}>Sync Now</button>
            </div>
            <div style={{ height: 320, borderRadius: 20, background: '#111827', display: 'grid', placeItems: 'center', color: '#6b7280' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14 }}>World map heatmap placeholder</p>
                <p style={{ marginTop: 8, color: '#9ca3af' }}>Connected entities, exposure zones, and high-value signal clusters.</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div style={{ padding: 22, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid #111827' }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Entity Graph</p>
              <h3 style={{ margin: '16px 0 0', fontSize: '1.35rem' }}>Relationship topology</h3>
              <div style={{ marginTop: 18, height: 200, borderRadius: 20, background: '#0f172a', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                network view placeholder
              </div>
            </div>
            <div style={{ padding: 22, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid #111827' }}>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Exposure Trends</p>
              <h3 style={{ margin: '16px 0 0', fontSize: '1.35rem' }}>Signal intensities</h3>
              <div style={{ marginTop: 18, height: 200, padding: 16, borderRadius: 20, background: '#0f172a', display: 'grid', gap: 12 }}>
                {connections.map(connection => (
                  <div key={connection.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{connection.label}</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{connection.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 18 }}>
          <div style={{ padding: 24, borderRadius: 28, border: '1px solid #111827', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Current Operations</p>
            <h2 style={{ margin: '14px 0 0', fontSize: '1.6rem' }}>Mission impact</h2>
            <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              <div style={{ padding: 16, borderRadius: 20, background: '#111827', border: '1px solid #1f2937' }}>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Detection</p>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>312</div>
                <p style={{ margin: '10px 0 0', color: '#9ca3af', fontSize: 13 }}>New public signal clusters</p>
              </div>
              <div style={{ padding: 16, borderRadius: 20, background: '#111827', border: '1px solid #1f2937' }}>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>Response</p>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>18</div>
                <p style={{ margin: '10px 0 0', color: '#9ca3af', fontSize: 13 }}>Prioritized incidents</p>
              </div>
            </div>
          </div>

          <div style={{ padding: 24, borderRadius: 28, border: '1px solid #111827', background: 'rgba(255,255,255,0.03)' }}>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Activity Log</p>
            <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              {activity.map(item => (
                <div key={item.time} style={{ padding: 14, borderRadius: 18, background: '#0f172a', border: '1px solid #1e293b' }}>
                  <p style={{ margin: 0, color: '#fff', fontWeight: 600 }}>{item.time}</p>
                  <p style={{ margin: '6px 0 0', color: '#9ca3af', fontSize: 14 }}>{item.event}</p>
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
