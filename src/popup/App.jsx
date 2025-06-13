import React, { useState, useEffect } from 'react';
import { handleUserMessage } from '../services/nebula';

const MANTLE_RPC = 'https://rpc.mantle.xyz';

function App() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Initialize with a contextual greeting once contract is loaded
    if (contract && contractInfo && chatMessages.length === 0) {
      const greeting = contractInfo.verified 
        ? `Hello! I'm analyzing ${contractInfo.contractName || 'this contract'}. It's verified and appears to be ${contractInfo.riskLevel === 'low' ? 'safe' : contractInfo.riskLevel === 'medium' ? 'moderately risky' : 'high risk'}. What would you like to know?`
        : `Hello! I'm ChainWhisperer. I've detected an ${contractInfo.verified ? 'verified' : 'unverified'} contract. Ask me anything about it!`;
      
      setChatMessages([{ type: 'ai', content: greeting }]);
    }
  }, [contract, contractInfo]);

  useEffect(() => {
    // Get current contract from background service worker
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_CONTRACT' }, (response) => {
      if (response) {
        setContract(response);
        fetchContractInfo(response);
      } else {
        setLoading(false);
      }
    });
  }, []);

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
          creation: contractData.creation
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

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{
        width: '400px',
        height: '600px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #334155',
            borderTop: '3px solid #06b6d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Analyzing contract...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{
        width: '400px',
        height: '600px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No contract detected</p>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Visit a contract page on Etherscan or Mantlescan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '400px',
      height: '600px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#e2e8f0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
        animation: 'float 6s ease-in-out infinite',
        pointerEvents: 'none'
      }}></div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 30px rgba(6, 182, 212, 0.6); }
        }
        @keyframes slideIn {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .message-animation {
          animation: fadeIn 0.3s ease-out;
        }
        .typing-dots {
          display: inline-block;
          animation: typing 1.5s infinite;
        }
        @keyframes typing {
          0%, 60%, 100% { opacity: 1; }
          30% { opacity: 0.3; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        padding: '16px',
        borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            animation: 'glow 2s ease-in-out infinite'
          }}>
            🔗
          </div>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '700',
              margin: 0,
              background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ChainWhisperer
            </h1>
            <p style={{
              fontSize: '11px',
              color: '#64748b',
              margin: 0,
              fontFamily: 'monospace'
            }}>
              {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {/* Contract Info Card */}
      <div style={{ padding: '16px', position: 'relative', zIndex: 10 }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)'
          }}></div>
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              margin: 0,
              color: '#f8fafc'
            }}>
              {contractInfo?.contractName || contract.contractName || 'Unknown Contract'}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {contractInfo?.verified && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  ✓ Verified
                </div>
              )}
              <div style={{
                background: `rgba(${contractInfo?.riskLevel === 'low' ? '16, 185, 129' : contractInfo?.riskLevel === 'medium' ? '245, 158, 11' : '239, 68, 68'}, 0.2)`,
                color: getRiskColor(contractInfo?.riskLevel),
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {contractInfo?.riskLevel} Risk
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '14px'
          }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Network:</span>
              <span style={{ color: '#f8fafc', fontWeight: '500', marginLeft: '8px' }}>
                {contract.chain?.charAt(0).toUpperCase() + contract.chain?.slice(1) || 'Mantle'}
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Balance:</span>
              <span style={{ color: '#f8fafc', fontWeight: '500', marginLeft: '8px' }}>
                {contractInfo?.balance || '0.0'} MNT
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Type:</span>
              <span style={{ color: '#f8fafc', fontWeight: '500', marginLeft: '8px' }}>
                {contractInfo?.proxy ? 'Proxy Contract' : 'Smart Contract'}
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Compiler:</span>
              <span style={{ color: '#f8fafc', fontWeight: '500', marginLeft: '8px' }}>
                {contractInfo?.compiler || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 16px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          background: 'rgba(30, 41, 59, 0.4)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(6, 182, 212, 0.2)',
            background: 'rgba(15, 23, 42, 0.5)'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#06b6d4'
            }}>
              💬 AI Assistant
            </h3>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className="message-animation"
                style={{
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div style={{
                  background: message.type === 'user' 
                    ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                    : 'rgba(51, 65, 85, 0.8)',
                  color: message.type === 'user' ? '#fff' : '#e2e8f0',
                  padding: '12px 16px',
                  borderRadius: message.type === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  boxShadow: message.type === 'user' 
                    ? '0 4px 12px rgba(6, 182, 212, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}>
                  {message.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                maxWidth: '85%'
              }}>
                <div style={{
                  background: 'rgba(51, 65, 85, 0.8)',
                  color: '#94a3b8',
                  padding: '12px 16px',
                  borderRadius: '16px 16px 16px 4px',
                  fontSize: '14px'
                }}>
                  <span className="typing-dots">AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(6, 182, 212, 0.2)',
            background: 'rgba(15, 23, 42, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end'
            }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about this contract..."
                style={{
                  flex: 1,
                  background: 'rgba(51, 65, 85, 0.6)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#06b6d4';
                  e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                style={{
                  background: inputMessage.trim() && !isTyping 
                    ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                    : 'rgba(51, 65, 85, 0.6)',
                  color: inputMessage.trim() && !isTyping ? '#fff' : '#64748b',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: inputMessage.trim() && !isTyping ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  minWidth: '60px'
                }}
                onMouseEnter={(e) => {
                  if (inputMessage.trim() && !isTyping) {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '16px' }}></div>
    </div>
  );
}

export default App;
