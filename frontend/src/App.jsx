import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import 'katex/dist/katex.min.css';

// Function to transform bracket-wrapped LaTeX expressions
const transformBracketMath = (text) => {
  if (!text) return text;
  
  // Transform [ ... ] to $ ... $ with precise spacing
  return text.replace(/\[\s*([^\[\]]*?)\s*\]/g, (match, captured) => {
    // Remove all leading and trailing spaces from the captured content
    const cleanContent = captured.trim();
    return `$${cleanContent}$`;
  });
};

// Simple error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "1rem", 
          background: "#fef2f2", 
          color: "#dc2626", 
          borderRadius: "8px",
          margin: "1rem"
        }}>
          <h3>Something went wrong</h3>
          <p>Please refresh the page and try again.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1rem",
              background: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  // State for form fields
  const [SystemMessage, setSystemMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7); // Default temperature
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Chat conversation history
  const [conversation, setConversation] = useState([]);
  
  // Health check state
  const [health, setHealth] = useState(null);
  
  // Ref for auto-scrolling to latest message
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatEndRef.current && chatContainerRef.current) {
      // Use a more reliable scroll method
      const scrollToBottom = () => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      };
      
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(scrollToBottom);
    }
  }, [conversation]);

  // Force scroll to bottom when loading state changes
  useEffect(() => {
    if (chatEndRef.current && chatContainerRef.current) {
      const scrollToBottom = () => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      };
      requestAnimationFrame(scrollToBottom);
    }
  }, [loading]);

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
          temperature,
        }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
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
          if (newConversation.length > 0) {
            newConversation[newConversation.length - 1] = {
              ...newConversation[newConversation.length - 1],
              content: result
            };
          }
          return newConversation;
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || "Unknown error occurred");
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

  // Custom styles for markdown components with tighter spacing
  const markdownComponents = {
    // Code blocks
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline ? (
        <pre style={{
          background: '#1f2937',
          color: '#f9fafb',
          padding: '0.75rem',
          borderRadius: '6px',
          overflow: 'auto',
          margin: '0.25rem 0',
          fontSize: '0.875rem',
          lineHeight: '1.4'
        }}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code style={{
          background: '#f3f4f6',
          color: '#dc2626',
          padding: '0.125rem 0.25rem',
          borderRadius: '4px',
          fontSize: '0.875em',
          fontFamily: 'monospace'
        }} {...props}>
          {children}
        </code>
      );
    },
    // Headers with tighter spacing
    h1: ({ children }) => <h1 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0.5rem 0 0.25rem 0', color: '#111827' }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ fontSize: '1.125rem', fontWeight: '600', margin: '0.375rem 0 0.25rem 0', color: '#111827' }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0.25rem 0 0.125rem 0', color: '#111827' }}>{children}</h3>,
    // Lists with tighter spacing
    ul: ({ children }) => <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>{children}</ol>,
    li: ({ children }) => <li style={{ margin: '0.125rem 0', display: 'list-item', whiteSpace: 'normal' }}>{children}</li>,
    // Links
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ 
          color: '#3b82f6', 
          textDecoration: 'underline',
          wordBreak: 'break-word'
        }}
      >
        {children}
      </a>
    ),
    // Blockquotes with tighter spacing
    blockquote: ({ children }) => (
      <blockquote style={{
        borderLeft: '3px solid #3b82f6',
        margin: '0.25rem 0',
        padding: '0.25rem 0.75rem',
        background: '#f8fafc',
        borderRadius: '0 4px 4px 0',
        fontStyle: 'italic'
      }}>
        {children}
      </blockquote>
    ),
    // Tables with tighter spacing
    table: ({ children }) => (
      <div style={{ overflow: 'auto', margin: '0.25rem 0' }}>
        <table style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: '0.875rem'
        }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{
        border: '1px solid #d1d5db',
        padding: '0.375rem',
        background: '#f9fafb',
        fontWeight: '600',
        textAlign: 'left'
      }}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td style={{
        border: '1px solid #d1d5db',
        padding: '0.375rem'
      }}>
        {children}
      </td>
    ),
    // Paragraphs with tighter spacing
    p: ({ children }) => <p style={{ margin: '0.25rem 0', lineHeight: '1.4' }}>{children}</p>,
    // Strong text
    strong: ({ children }) => <strong style={{ fontWeight: '600' }}>{children}</strong>,
    // Emphasis
    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  };

  return (
    <ErrorBoundary>
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
          flexWrap: "wrap",
          alignItems: "center"
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
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            gap: "0.25rem"
          }}>
            <label style={{ 
              fontSize: "0.75rem", 
              color: "#64748b", 
              fontWeight: "500"
            }}>
              Model Temperature: {temperature}
            </label>
            <div style={{ 
              display: "flex", 
              alignItems: "center",
              gap: "0.5rem",
              width: "200px"
            }}>
              <span style={{ 
                fontSize: "0.625rem", 
                color: "#94a3b8",
                whiteSpace: "nowrap"
              }}>
                Less Creative
              </span>
              <input
                type="range"
                min="0.2"
                max="1.2"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
                style={{
                  flex: 1,
                  cursor: "pointer"
                }}
              />
              <span style={{ 
                fontSize: "0.625rem", 
                color: "#94a3b8",
                whiteSpace: "nowrap"
              }}>
                More Creative
              </span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          style={{ 
            flex: 1, 
            overflowY: "auto", 
            padding: "1rem 1.5rem",
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            height: "calc(90vh - 280px)",
            minHeight: "300px",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
                    {message.type === "user" ? (
                      <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                    ) : (
                      <div style={{ 
                        fontSize: "0.875rem",
                        lineHeight: "1.4",
                        overflow: "auto",
                        maxWidth: "100%"
                      }}>
                        <style>{`
                          .katex-display {
                            margin: 0.75rem 0 !important;
                            overflow-x: auto !important;
                            max-width: 100% !important;
                            text-align: center !important;
                          }
                          .katex {
                            font-size: 1.1em !important;
                            line-height: 1.2 !important;
                          }
                          .katex .mfrac {
                            margin: 0 0.2em !important;
                          }
                        `}</style>
                        {message.content ? (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={markdownComponents}
                          >
                            {transformBracketMath(message.content)}
                          </ReactMarkdown>
                        ) : (
                          <div>Loading...</div>
                        )}
                        {loading && index === conversation.length - 1 && (
                          <span style={{ opacity: 0.7 }}>...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div ref={chatEndRef} style={{ height: "1px" }} />
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
    </ErrorBoundary>
  );
} 