import React, { useState, useEffect } from 'react';
import "./App.css";

function App() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contractDetails, setContractDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Get current contract from service worker
      const response = await chrome.runtime.sendMessage({ 
        type: 'GET_CURRENT_CONTRACT' 
      });
      
      if (response) {
        setContract(response);
        
        // Initialize chat session via service worker
        const sessionResponse = await chrome.runtime.sendMessage({
          type: 'INITIALIZE_CHAT_SESSION',
          contractAddress: response.address
        });
        
        if (sessionResponse.success) {
          setSessionId(sessionResponse.sessionId);
          setContractDetails(sessionResponse.contractDetails);
          
          // Set initial messages
          const initialMessages = [
            { type: 'ai', content: sessionResponse.greeting }
          ];
          
          if (sessionResponse.contractDetails) {
            initialMessages.push({
              type: 'ai',
              content: sessionResponse.contractDetails
            });
          }
          
          setChatMessages(initialMessages);
        } else {
          setError(sessionResponse.error);
        }
      }
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || isTyping) return;

    const userMessage = inputMessage.trim();
    setChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);
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
        setChatMessages(prev => [...prev, { type: 'ai', content: response.response }]);
      } else {
        // Use fallback response if provided
        const errorMessage = response.fallbackResponse || 
          "Sorry, I encountered an error processing your request.";
        setChatMessages(prev => [...prev, { type: 'ai', content: errorMessage }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setChatMessages(prev => [...prev, { 
        type: 'ai', 
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
          <p>Analyzing contract...</p>
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
            <h3 className="chat-title">💬 AI Assistant</h3>
          </div>

          <div className="messages-container">
            {chatMessages.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                <div className={`message-bubble ${message.type}`}>
                  {message.content}
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