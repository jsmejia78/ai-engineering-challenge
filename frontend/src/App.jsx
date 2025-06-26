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
      height: "90vh",
      display: "flex",
      flexDirection: "column",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "1rem 1.5rem", 
        borderBottom: "1px solid #e1e8ed",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#fff", fontWeight: "600" }}>
          AI Chat {health && <span title="API Health">{health}</span>}
        </h1>
        <button 
          onClick={clearConversation}
          style={{
            padding: "0.5rem 1rem",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
          onMouseOver={(e) => e.target.style.background = "rgba(255,255,255,0.3)"}
          onMouseOut={(e) => e.target.style.background = "rgba(255,255,255,0.2)"}
        >
          Clear Chat
        </button>
      </div>

      {/* Settings Panel */}
      <div style={{ 
        padding: "0.75rem 1.5rem", 
        borderBottom: "1px solid #e1e8ed",
        background: "#f8fafc",
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap"
      }}>
        <input
          type="text"
          placeholder="System message (optional)"
          value={SystemMessage}
          onChange={e => setSystemMessage(e.target.value)}
          style={{ 
            flex: 1, 
            minWidth: "200px", 
            padding: "0.5rem 0.75rem", 
            border: "1px solid #e2e8f0", 
            borderRadius: "8px",
            fontSize: "0.875rem",
            background: "#fff"
          }}
        />
        <input
          type="text"
          placeholder="Model (optional)"
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{ 
            width: "140px", 
            padding: "0.5rem 0.75rem", 
            border: "1px solid #e2e8f0", 
            borderRadius: "8px",
            fontSize: "0.875rem",
            background: "#fff"
          }}
        />
        <input
          type="password"
          placeholder="OpenAI API Key"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          style={{ 
            width: "180px", 
            padding: "0.5rem 0.75rem", 
            border: "1px solid #e2e8f0", 
            borderRadius: "8px",
            fontSize: "0.875rem",
            background: "#fff"
          }}
        />
      </div>

      {/* Chat Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "1rem 1.5rem",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        maxHeight: "calc(90vh - 200px)"
      }}>
        {conversation.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "#64748b", 
            marginTop: "2rem",
            fontSize: "1.1rem",
            fontWeight: "500"
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
                  padding: "0.875rem 1.125rem",
                  borderRadius: "20px",
                  background: message.type === "user" 
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                    : "#fff",
                  color: message.type === "user" ? "#fff" : "#374151",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  wordWrap: "break-word",
                  whiteSpace: "pre-wrap",
                  border: message.type === "assistant" ? "1px solid #e5e7eb" : "none"
                }}
              >
                <div style={{ 
                  marginBottom: "0.25rem", 
                  fontSize: "0.75rem", 
                  opacity: 0.8,
                  fontWeight: "500"
                }}>
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
          background: "linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)", 
          color: "#dc2626", 
          borderTop: "1px solid #fca5a5",
          fontSize: "0.875rem",
          fontWeight: "500"
        }}>
          {error}
        </div>
      )}

      {/* Message Input */}
      <div style={{ 
        padding: "1rem 1.5rem", 
        borderTop: "1px solid #e1e8ed",
        background: "#fff"
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.75rem" }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={userMessage}
            onChange={e => setUserMessage(e.target.value)}
            disabled={loading}
            style={{ 
              flex: 1, 
              padding: "0.875rem 1.25rem", 
              border: "2px solid #e2e8f0", 
              borderRadius: "25px",
              fontSize: "1rem",
              background: "#fff",
              transition: "border-color 0.2s ease"
            }}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
          />
          <button 
            type="submit" 
            disabled={loading || !userMessage.trim()} 
            style={{ 
              padding: "0.875rem 1.5rem", 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
              color: "white", 
              border: "none", 
              borderRadius: "25px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)"
            }}
            onMouseOver={(e) => e.target.style.transform = "translateY(-1px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{ 
        padding: "0.5rem 1.5rem", 
        fontSize: "0.75rem", 
        color: "#64748b",
        textAlign: "center",
        borderTop: "1px solid #e1e8ed",
        background: "#f8fafc"
      }}>
        Powered by OpenAI & FastAPI | <a href="https://vercel.com/" target="_blank" rel="noopener noreferrer" style={{color: "#667eea", textDecoration: "none"}}>Vercel Ready</a>
      </div>
    </div>
  );
} 