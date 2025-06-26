import React, { useState, useRef, useEffect } from "react";

export default function App() {
  // State for form fields
  const [SystemMessage, setSystemMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Chat conversation history
  const [conversation, setConversation] = useState([]);
  
  // Health check state
  const [health, setHealth] = useState(null);
  
  // Ref for auto-scrolling to latest message
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

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
    if (!userMessage.trim()) return;
    
    setLoading(true);
    setError("");
    
    // Add user message to conversation
    const userMsg = { type: "user", content: userMessage, timestamp: new Date() };
    setConversation(prev => [...prev, userMsg]);
    
    const currentUserMessage = userMessage;
    setUserMessage(""); // Clear input immediately
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_message: SystemMessage,
          user_message: currentUserMessage,
          model,
          api_key: apiKey,
        }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      let result = "";
      
      // Add assistant message placeholder
      const assistantMsg = { type: "assistant", content: "", timestamp: new Date() };
      setConversation(prev => [...prev, assistantMsg]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
        
        // Update the assistant message content
        setConversation(prev => {
          const newConversation = [...prev];
          newConversation[newConversation.length - 1] = {
            ...newConversation[newConversation.length - 1],
            content: result
          };
          return newConversation;
        });
      }
    } catch (err) {
      setError(err.message || "Unknown error");
      // Remove the assistant message if there was an error
      setConversation(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setConversation([]);
    setError("");
  };

  return (
    <div style={{ 
      fontFamily: "sans-serif", 
      maxWidth: 800, 
      margin: "1rem auto", 
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 2px 16px #0001",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "1rem 1.5rem", 
        borderBottom: "1px solid #eee",
        background: "#f8f9fa",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
          AI Chat {health && <span title="API Health">{health}</span>}
        </h1>
        <button 
          onClick={clearConversation}
          style={{
            padding: "0.5rem 1rem",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.875rem"
          }}
        >
          Clear Chat
        </button>
      </div>

      {/* Settings Panel */}
      <div style={{ 
        padding: "1rem 1.5rem", 
        borderBottom: "1px solid #eee",
        background: "#f8f9fa",
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
        <input
          type="text"
          placeholder="System message (optional)"
          value={SystemMessage}
          onChange={e => setSystemMessage(e.target.value)}
          style={{ flex: 1, minWidth: "200px", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px" }}
        />
        <input
          type="text"
          placeholder="Model (optional)"
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{ width: "150px", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px" }}
        />
        <input
          type="password"
          placeholder="OpenAI API Key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={{ width: "200px", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px" }}
        />
      </div>

      {/* Chat Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "1rem 1.5rem",
        background: "#f8f9fa"
      }}>
        {conversation.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#666", 
            marginTop: "2rem",
            fontSize: "1.1rem"
          }}>
            Start a conversation by typing a message below!
          </div>
        ) : (
          conversation.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom: "1rem",
                display: "flex",
                justifyContent: message.type === "user" ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "0.75rem 1rem",
                  borderRadius: "18px",
                  background: message.type === "user" ? "#007bff" : "#fff",
                  color: message.type === "user" ? "#fff" : "#333",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  wordWrap: "break-word",
                  whiteSpace: "pre-wrap"
                }}
              >
                <div style={{ marginBottom: "0.25rem", fontSize: "0.75rem", opacity: 0.7 }}>
                  {message.type === "user" ? "You" : "AI Assistant"}
                </div>
                {message.content}
                {message.type === "assistant" && loading && index === conversation.length - 1 && (
                  <span style={{ opacity: 0.7 }}>...</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: "0.75rem 1.5rem", 
          background: "#f8d7da", 
          color: "#721c24", 
          borderTop: "1px solid #f5c6cb",
          fontSize: "0.875rem"
        }}>
          {error}
        </div>
      )}

      {/* Message Input */}
      <div style={{ 
        padding: "1rem 1.5rem", 
        borderTop: "1px solid #eee",
        background: "#fff"
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={userMessage}
            onChange={e => setUserMessage(e.target.value)}
            disabled={loading}
            style={{ 
              flex: 1, 
              padding: "0.75rem", 
              border: "1px solid #ddd", 
              borderRadius: "24px",
              fontSize: "1rem"
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !userMessage.trim()} 
            style={{ 
              padding: "0.75rem 1.5rem", 
              background: "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "24px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "1rem"
            }}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{ 
        padding: "0.5rem 1.5rem", 
        fontSize: "0.75rem", 
        color: "#888",
        textAlign: "center",
        borderTop: "1px solid #eee"
      }}>
        Powered by OpenAI & FastAPI | <a href="https://vercel.com/" target="_blank" rel="noopener noreferrer">Vercel Ready</a>
      </div>
    </div>
  );
} 