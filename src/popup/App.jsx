import React, { useState, useEffect } from 'react';
import { createSession, handleUserMessage, queryContract } from '../services/nebula';
import "./App.css";
import { ethers } from 'ethers';

const MANTLE_RPC = 'https://rpc.mantle.xyz';

function App() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState(null);
  const [contractDetails, setContractDetails] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      // Get current contract from background service worker
      chrome.runtime.sendMessage({ type: 'GET_CURRENT_CONTRACT' }, async (response) => {
        if (response) {
          setContract(response);
          console.log("new details");

          await fetchContractInfo(response);

          // Create Nebula session
          const newSessionId = await createSession(`ChainWhisperer - ${response.contractName || 'Contract'}`);
          setSessionId(newSessionId);

          const contractDetails = await queryContract(
            response.address,
            5000,
            newSessionId
          );

          setContractDetails(contractDetails);

          // Set initial greeting based on contract info
          const greeting = response.verified
            ? `Hello! I'm analyzing ${response.contractName || 'this contract'}. It's verified and appears to be safe. What would you like to know?`
            : `Hello! I'm ChainWhisperer. I've detected a contract. Ask me anything about it!`;

          setChatMessages([{ type: 'ai', content: greeting }]);
        } else {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error initializing session:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize with a contextual greeting once contract is loaded
    if (contract && contractInfo && chatMessages.length === 0) {
      const greeting = contractInfo.verified
        ? `Hello! I'm analyzing ${contractInfo.contractName || 'this contract'}. It's verified and appears to be ${contractInfo.riskLevel === 'low' ? 'safe' : contractInfo.riskLevel === 'medium' ? 'moderately risky' : 'high risk'}. What would you like to know?`
        : `Hello! I'm ChainWhisperer. I've detected an ${contractInfo.verified ? 'verified' : 'unverified'} contract. Ask me anything about it!`;

      setChatMessages([
        { type: 'ai', content: greeting },
        {
        type: "ai",
        content:
          contractDetails || "No details available for this contract.",
      }]);
    }
  }, [contract, contractDetails]);

  const fetchContractInfo = async (contractData) => {
    try {
      // If we have verified contract data, use it directly
      if (contractData.verified && contractData.abi) {
        setContractInfo({
          isContract: true,
          balance: '0.0', // This would be fetched from RPC if needed
          codeSize: contractData.sourceCode?.length || 0,
          riskLevel: assessRiskLevel(contractData),
          verified: contractData.verified,
          contractName: contractData.contractName,
          compiler: contractData.compilerVersion,
          optimization: contractData.optimizationUsed,
          proxy: contractData.proxy,
          creation: contractData.creation,
        });
      } else {
        // Fallback to basic RPC data
        const provider = new ethers.JsonRpcProvider(MANTLE_RPC);
        const code = await provider.getCode(contractData.address);
        const balance = await provider.getBalance(contractData.address);

        setContractInfo({
          isContract: code !== '0x',
          balance: ethers.formatEther(balance),
          codeSize: (code.length - 2) / 2,
          riskLevel: 'unknown',
          verified: false
        });
      }
    } catch (error) {
      console.error('Error fetching contract info:', error);
      setContractInfo({
        isContract: false,
        balance: '0.0',
        codeSize: 0,
        riskLevel: 'unknown',
        verified: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const assessRiskLevel = (contractData) => {
    // Basic risk assessment based on contract properties
    let riskScore = 0;

    if (!contractData.verified) riskScore += 30;
    if (contractData.proxy) riskScore += 20;
    if (!contractData.optimizationUsed) riskScore += 10;

    // Check for dangerous functions in ABI
    if (contractData.abi) {
      const dangerousFunctions = ['selfdestruct', 'delegatecall', 'suicide'];
      const hasRiskyFunctions = contractData.abi.some(item =>
        item.type === 'function' &&
        dangerousFunctions.some(dangerous =>
          item.name?.toLowerCase().includes(dangerous)
        )
      );
      if (hasRiskyFunctions) riskScore += 40;
    }

    if (riskScore >= 50) return 'high';
    if (riskScore >= 25) return 'medium';
    return 'low';
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || !contract) return;

    const userMessage = inputMessage.trim();
    setChatMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Get chain ID for Mantle (assuming chain ID 5000)
      const chainId = contract.chain === 'mantle' ? '5000' : '1';

      // Send message to Nebula API
      const response = await handleUserMessage(
        userMessage,
        sessionId,
        chainId,
        contract.address
      );

      setChatMessages(prev => [...prev, { type: 'ai', content: response }]);
    } catch (error) {
      console.error('Error sending message to Nebula:', error);

      // Fallback response
      const fallbackResponses = [
        "I'm having trouble connecting to analyze this contract. Please try again in a moment.",
        "Sorry, I encountered an error while processing your request. Could you rephrase your question?",
        "There seems to be a temporary issue with the AI service. Please retry your query."
      ];
      const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      setChatMessages(prev => [...prev, { type: 'ai', content: fallbackResponse }]);
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
              {contractInfo?.contractName || contract.contractName || 'Unknown Contract'}
            </h2>
            <div className="badges">
              {contractInfo?.verified && (
                <div className="badge badge-verified">✓ Verified</div>
              )}
              <div className={`badge-risk ${contractInfo?.riskLevel || 'unknown'}`}>
                {contractInfo?.riskLevel || 'unknown'} Risk
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
                {contractInfo?.balance || '0.0'} MNT
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">
                {contractInfo?.proxy ? 'Proxy Contract' : 'Smart Contract'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Compiler:</span>
              <span className="detail-value">
                {contractInfo?.compiler || 'Unknown'}
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
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className={`send-button ${inputMessage.trim() && !isTyping ? 'enabled' : 'disabled'}`}
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