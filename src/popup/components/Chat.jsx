// src/popup/components/Chat.jsx
import React, { useState } from 'react';

function Chat({ contract, contractAnalysis }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // For MVP, use predefined responses
      // In production, this would call OpenAI/Claude API
      const response = await generateResponse(input, contractAnalysis);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response
      }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500">
            <p className="mb-2">Ask me anything about this contract!</p>
            <div className="text-sm space-y-1">
              <p>• "Is this contract safe?"</p>
              <p>• "What does the approve function do?"</p>
              <p>• "Explain this contract in simple terms"</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${
              msg.role === 'user' 
                ? 'bg-indigo-100 ml-auto' 
                : 'bg-gray-100'
            } rounded-lg p-3 max-w-[80%]`}
          >
            <p className="text-sm">{msg.content}</p>
          </div>
        ))}
        
        {loading && (
          <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
            <p className="text-sm">Analyzing...</p>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about this contract..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Temporary response generator for MVP
async function generateResponse(question, analysis) {
  const q = question.toLowerCase();
  
  if (q.includes('safe')) {
    if (analysis.risks.length === 0) {
      return "This contract appears relatively safe with no major red flags detected.";
    } else {
      return `This contract has ${analysis.risks.length} potential risks: ${analysis.risks.map(r => r.message).join(', ')}`;
    }
  }
  
  if (q.includes('approve')) {
    return "The approve function allows another address to spend tokens on your behalf. Be careful with unlimited approvals!";
  }
  
  if (q.includes('explain')) {
    return `This is a smart contract on Mantle with ${analysis.functions?.length || 0} functions. It appears to be ${analysis.basic.isContract ? 'a verified contract' : 'an EOA'}.`;
  }
  
  return "I can help you understand this contract. Try asking about its safety, functions, or risks!";
}

export default Chat;