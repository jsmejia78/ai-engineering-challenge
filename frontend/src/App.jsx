import React, { useState } from "react";

export default function App() {
  // State for form fields
  const [developerMessage, setDeveloperMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Health check state
  const [health, setHealth] = useState(null);

  // Health check on mount
  React.useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data.status === "ok" ? "🟢" : "🔴"))
      .catch(() => setHealth("🔴"));
  }, []);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developer_message: developerMessage,
          user_message: userMessage,
          model,
          api_key: apiKey,
        }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
        setResponse(result);
      }
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "2rem auto", padding: 24, borderRadius: 12, boxShadow: "0 2px 16px #0001", background: "#fff" }}>
      <h1>AI Chat Frontend {health && <span title="API Health">{health}</span>}</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="text"
          placeholder="Developer message"
          value={developerMessage}
          onChange={e => setDeveloperMessage(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="User message"
          value={userMessage}
          onChange={e => setUserMessage(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Model (optional)"
          value={model}
          onChange={e => setModel(e.target.value)}
        />
        <input
          type="password"
          placeholder="OpenAI API Key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          required
        />
        <button type="submit" disabled={loading} style={{ padding: 8, fontWeight: 600 }}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      <div style={{ marginTop: 24, whiteSpace: "pre-wrap", background: "#f9f9f9", padding: 16, borderRadius: 8, minHeight: 80 }}>
        {response || (loading ? "Waiting for response..." : "Response will appear here.")}
      </div>
      <footer style={{ marginTop: 32, fontSize: 12, color: "#888" }}>
        Powered by OpenAI & FastAPI | <a href="https://vercel.com/" target="_blank" rel="noopener noreferrer">Vercel Ready</a>
      </footer>
    </div>
  );
} 