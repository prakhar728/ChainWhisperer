import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import "./App.css";

function App() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing contract...');
  const [contractDetails, setContractDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [isRestored, setIsRestored] = useState(false);
  const messagesEndRef = useRef(null);
  const [awaitingUpload, setAwaitingUpload] = useState(false);
  const [pastedBytecode, setPastedBytecode] = useState('');

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoadingMessage('Getting contract data...');

      // Get current contract from service worker
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CURRENT_CONTRACT'
      });

      if (response) {
        setContract(response);
        setLoadingMessage(isRestored ? 'Restoring conversation...' : 'Analyzing contract functions...');

        // Initialize chat session via service worker
        const sessionResponse = await chrome.runtime.sendMessage({
          type: 'INITIALIZE_CHAT_SESSION',
          contractAddress: response.address
        });

        if (sessionResponse.success) {
          setSessionId(sessionResponse.sessionId);
          setContractDetails(sessionResponse.contractDetails);
          setIsRestored(sessionResponse.isRestored || false);

          // Set messages from restored chat history or create initial messages
          if (sessionResponse.chatHistory && sessionResponse.chatHistory.length > 0) {
            setChatMessages(sessionResponse.chatHistory);
          } else {
            // Fallback to single greeting if no history
            const initialMessages = [
              { role: 'assistant', content: sessionResponse.greeting }
            ];

            if (sessionResponse.contractDetails) {
              initialMessages.push({
                role: 'assistant',
                content: sessionResponse.contractDetails
              });
            }

            setChatMessages(initialMessages);
          }
        } else {
          if (sessionResponse.awaitingUpload) {
            setAwaitingUpload(true);
            setContract(response);
          } else {
            setError(sessionResponse.error || 'Unknown error during session initialization');
          }
        }
      }
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBytecode = async () => {
    if (!pastedBytecode.trim() || !contract) return;

    try {
      const uploadResponse = await chrome.runtime.sendMessage({
        type: 'SEND_DECOMPILED_CODE',
        contractAddress: contract.address,
        bytecodeText: pastedBytecode
      });

      if (uploadResponse.success) {
        setSessionId(uploadResponse.sessionId);
        setContractDetails(uploadResponse.contractDetails);
        setChatMessages(uploadResponse.chatHistory);
        setAwaitingUpload(false);
        setPastedBytecode('');
      } else {
        setError(uploadResponse.error || 'Failed to analyze pasted bytecode.');
      }
    } catch (err) {
      console.error('Error submitting bytecode:', err);
      setError('Error submitting bytecode.');
    }
  };



  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isTyping) return;

    const userMessage = inputMessage.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Send message via service worker
      const response = await chrome.runtime.sendMessage({
        type: 'SEND_CHAT_MESSAGE',
        message: userMessage,
        sessionId: sessionId
      });

      if (response.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      } else {
        // Use fallback response if provided
        const errorMessage = response.fallbackResponse ||
          "Sorry, I encountered an error processing your request.";
        setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRiskColorClass = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'low';
      case 'medium': return 'medium';
      case 'high': return 'high';
      default: return 'unknown';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>{loadingMessage}</p>
          {isRestored && (
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
              Restoring previous conversation...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div>
          <div className="empty-icon">⚠️</div>
          <p className="empty-title">Error Loading Contract</p>
          <p className="empty-subtitle">{error}</p>
          <button
            onClick={initializeApp}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (awaitingUpload) {
    return (
      <div className="upload-state">
        <div className="empty-state">
          <div>
            <div className="empty-icon">📦</div>
            <p className="empty-title">Contract Not Verified</p>
            <p className="empty-subtitle">
              This contract isn’t verified. Paste the decompiled bytecode below for analysis.
            </p>

            <textarea
              rows="10"
              placeholder="Paste decompiled bytecode here..."
              value={pastedBytecode}
              onChange={(e) => setPastedBytecode(e.target.value)}
              className="bytecode-textarea"
              style={{
                width: '100%',
                maxWidth: '500px',
                padding: '10px',
                marginTop: '10px',
                fontSize: '14px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontFamily: 'monospace'
              }}
            />

            <button
              onClick={handleSubmitBytecode}
              className="retry-button"
              style={{ marginTop: '12px' }}
              disabled={!pastedBytecode.trim()}
            >
              Analyze Bytecode
            </button>
          </div>
        </div>
      </div>
    );
  }


  if (!contract) {
    return (
      <div className="empty-state">
        <div>
          <div className="empty-icon">🔍</div>
          <p className="empty-title">No contract detected</p>
          <p className="empty-subtitle">
            Visit a contract page on Etherscan or Mantlescan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chainwhisperer-container">
      <div className="animated-background"></div>

      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="logo">🔗</div>
          <div className="header-text">
            <h1>ChainWhisperer</h1>
            <p className="header-address">
              {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {/* Contract Info Card */}
      <div className="contract-info-section">
        <div className="contract-info-card">
          <div className="contract-info-header"></div>

          <div className="contract-title-row">
            <h2 className="contract-title">
              {contract.contractName || 'Unknown Contract'}
            </h2>
            <div className="badges">
              {contract.verified && (
                <div className="badge badge-verified">✓ Verified</div>
              )}
              <div className={`badge-risk ${getRiskColorClass(contract.riskLevel)}`}>
                {contract.riskLevel || 'unknown'} Risk
              </div>
            </div>
          </div>

          <div className="contract-details">
            <div className="detail-item">
              <span className="detail-label">Network:</span>
              <span className="detail-value">
                {contract.chain?.charAt(0).toUpperCase() + contract.chain?.slice(1) || 'Mantle'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Balance:</span>
              <span className="detail-value">
                {contract.balance || '0.0'} MNT
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                {contract.proxy ? 'Proxy Contract' : 'Smart Contract'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Compiler:</span>
              <span className="detail-value">
                {contract.compilerVersion || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="chat-section">
        <div className="chat-container">
          <div className="chat-header">
            <h3 className="chat-title">
              💬 AI Assistant
              {isRestored && (
                <span style={{
                  fontSize: '11px',
                  color: '#10b981',
                  marginLeft: '8px',
                  fontWeight: 'normal'
                }}>
                  (Conversation Restored)
                </span>
              )}
            </h3>
          </div>

          <div className="messages-container">
            {chatMessages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className={`message-bubble ${message.role}`}>
                  {message.role === 'assistant' ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="typing-indicator">
                <div className="typing-bubble">
                  <span className="typing-dots">AI is thinking...</span>
                </div>
              </div>
            )}

            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-section">
            <div className="input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about this contract..."
                className="message-input"
                disabled={isTyping || !sessionId}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || !sessionId}
                className={`send-button ${inputMessage.trim() && !isTyping && sessionId ? 'enabled' : 'disabled'}`}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="spacer"></div>
    </div>
  );
}

export default App;