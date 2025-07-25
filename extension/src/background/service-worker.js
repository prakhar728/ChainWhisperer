// src/background/service-worker.js
import Decompiler from '../services/Decompiler.js';
import { fetchDecompiledCode, fetchDecompiledSource } from '../services/DeDaub.js';
import MantleAPI from '../services/mantleAPI.js';
import { auditDecompiledContract, createSession, getSession, handleUserMessage, queryRawContract } from '../services/nebula.js';
import { getChainId } from '../utils.js';

let mantleAPI;
let contractCache = new Map();
let sessionCache = new Map();
const decompiler = new Decompiler('http://localhost:8000');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CONTRACT_DETECTED':
      handleContractDetected(request, sender.tab);
      break;
    case 'GET_CURRENT_CONTRACT':
      const cached = contractCache.get(request.address || 'current');
      sendResponse(cached || null);
      break;
    case 'INITIALIZE_CHAT_SESSION':
      handleInitializeChatSession(request, sendResponse);
      break;
    case 'SEND_CHAT_MESSAGE':
      handleChatMessage(request, sendResponse);
      break;
    case 'SEND_DECOMPILED_CODE':
      handleDecompiledCodeUpload(request, sendResponse);
      break;
    case 'OPEN_POPUP':
      chrome.action.openPopup();
      break;
  }
  return true;
});

async function handleContractDetected(request, tab) {
  const { address, chain, fetchVerified } = request;
  const chainId = getChainId(chain);

  mantleAPI = mantleAPI ? mantleAPI : new MantleAPI(undefined, chainId);

  // Store basic info immediately
  const contractInfo = {
    address,
    chain,
    timestamp: Date.now(),
    tabId: tab?.id,
    verified: false,
    loading: true
  };

  contractCache.set('current', contractInfo);
  contractCache.set(address, contractInfo);

  // Update extension badge
  chrome.action.setBadgeText({ text: '...' });
  chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });

  // Store in extension storage
  chrome.storage.local.set({ currentContract: contractInfo });

  if (fetchVerified && (chain === 'mantle' || chain === 'mantle-sepolia')) {

    // Notify content script that we're fetching
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_INDICATOR',
        status: 'loading',
        message: 'Fetching contract data...'
      });
    }

    try {
      // Fetch verified contract data
      const verifiedData = await mantleAPI.getVerifiedContract(address);

      // Fetch additional data in parallel
      const [creationData] = await Promise.all([
        mantleAPI.getContractCreation(address)
      ]);

      // Assess risk level
      const riskLevel = assessRiskLevel(verifiedData);

      const isActuallyVerified = verifiedData.abi !== null && verifiedData.abi !== "Contract source code not verified";

      if (!isActuallyVerified) {
        verifiedData.verified = false;
        verifiedData.contractName = verifiedData.contractName || 'Unknown';
        verifiedData.abi = null;
        verifiedData.sourceCode = null;
        verifiedData.message = 'Contract not verified oopsie';
      }


      // Update contract info
      const enrichedContract = {
        ...contractInfo,
        ...verifiedData,
        creation: creationData,
        riskLevel,
        loading: false,
        fetchedAt: Date.now()
      };

      // Cache the enriched data
      contractCache.set('current', enrichedContract);
      contractCache.set(address, enrichedContract);

      // Store in extension storage
      chrome.storage.local.set({
        currentContract: enrichedContract,
        [`contract_${address}`]: enrichedContract
      });

      // Update badge based on verification status
      chrome.action.setBadgeText({ text: verifiedData.verified ? '✓' : '!' });
      chrome.action.setBadgeBackgroundColor({
        color: verifiedData.verified ? '#10B981' : '#EF4444'
      });

      // Notify content script
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'UPDATE_INDICATOR',
          status: verifiedData.verified ? 'success' : 'warning',
          message: verifiedData.verified
            ? `✅ Verified: ${verifiedData.contractName}`
            : '⚠️ Contract not verified'
        });
      }

      console.log('Contract data fetched:', enrichedContract);
    } catch (error) {
      console.error('Error fetching contract:', error);

      // Update with error state
      const errorContract = {
        ...contractInfo,
        loading: false,
        error: error.message,
        riskLevel: 'unknown'
      };

      contractCache.set('current', errorContract);
      contractCache.set(address, errorContract);

      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'UPDATE_INDICATOR',
          status: 'error',
          message: '❌ Error fetching contract'
        });
      }
    }
  }
}

async function handleInitializeChatSession(request, sendResponse) {
  try {
    const { contractAddress } = request;
    const contract = contractCache.get(contractAddress) || contractCache.get('current');

    if (!contract) {
      sendResponse({ error: 'No contract found' });
      return;
    }

    const sessionCacheKey = `session_${contractAddress}`;
    let cachedSessionData = await chrome.storage.local.get([sessionCacheKey]);
    let sessionId = '';
    let sessionInfo = {};
    let chatHistory = [];
    let contractDetails = '';

    if (cachedSessionData[sessionCacheKey]) {
      const cachedSession = cachedSessionData[sessionCacheKey];
      sessionId = cachedSession.sessionId;

      try {
        const sessionResponse = await getSession(sessionId);

        if (sessionResponse && sessionResponse.result) {
          sessionInfo = sessionResponse.result;

          if (sessionInfo.history && sessionInfo.history.length > 0) {
            chatHistory = sessionInfo.history.map(msg => ({
              role: msg.role,
              content: msg.role === 'assistant' ? msg.content :
                (Array.isArray(msg.content) ? msg.content[0]?.text || '' : msg.content)
            }));

            const firstAssistantMessage = chatHistory.find(msg => msg.role === 'assistant');
            if (firstAssistantMessage) {
              contractDetails = firstAssistantMessage.content;
            }
          }

          const chainId = getChainId(contract.chain);

          const sessionCacheInfo = {
            sessionId,
            contractAddress: contract.address,
            chainId,
            createdAt: new Date(sessionInfo.created_at).getTime(),
            lastUsed: Date.now()
          };

          sessionCache.set(sessionId, sessionCacheInfo);
          sessionCache.set(`contract_${contract.address}`, sessionCacheInfo);

          sendResponse({
            success: true,
            sessionId,
            contract,
            contractDetails,
            chatHistory,
            isRestored: true,
            greeting: "Welcome back! I've restored our previous conversation."
          });
          return;
        }
      } catch (error) {}
    }

    sessionId = await createSession(`ChainWhisperer - ${contract.contractName || contractAddress.slice(0, 8)}`);
    const chainId = getChainId(contract.chain);
    const verifiedData = await mantleAPI.getVerifiedContract(contract.address);

    const isActuallyVerified =
      verifiedData.abi !== null &&
      verifiedData.abi !== "Contract source code not verified";

    if (!isActuallyVerified) {
      sendResponse({
        success: false,
        contract,
        awaitingUpload: true,
        message: 'This contract is not verified. Please upload the decompiled bytecode to proceed.'
      });
      return;
    }

    contractDetails = await queryRawContract(
      contract.address,
      verifiedData.sourceCode,
      chainId,
      sessionId
    );

    const updatedContract = {
      ...contract,
      ...verifiedData,
      verified: isActuallyVerified
    };

    const sessionCacheInfo = {
      sessionId,
      contractAddress: updatedContract.address,
      chainId,
      createdAt: Date.now()
    };

    sessionCache.set(sessionId, sessionCacheInfo);
    sessionCache.set(`contract_${updatedContract.address}`, sessionCacheInfo);

    await chrome.storage.local.set({
      [sessionCacheKey]: sessionCacheInfo
    });

    const greeting = generateInitialGreeting(updatedContract);
    chatHistory = [
      { role: 'assistant', content: greeting },
      { role: 'assistant', content: contractDetails }
    ];

    sendResponse({
      success: true,
      sessionId,
      contract: updatedContract,
      contractDetails,
      chatHistory,
      isRestored: false,
      greeting
    });
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

async function handleDecompiledCodeUpload(request, sendResponse) {
  const { contractAddress, bytecodeText } = request;
  try {
    const contract = contractCache.get(contractAddress) || contractCache.get('current');
    const sessionId = await createSession(`Decompiled - ${contractAddress.slice(0, 8)}`);
    const chainId = getChainId(contract.chain);

    const decompiledResponse = await auditDecompiledContract(
      contractAddress,
      bytecodeText,
      chainId,
      sessionId
    );

    const sessionInfo = {
      sessionId,
      contractAddress,
      chainId,
      createdAt: Date.now()
    };

    sessionCache.set(sessionId, sessionInfo);
    sessionCache.set(`contract_${contractAddress}`, sessionInfo);

    await chrome.storage.local.set({
      [`session_${contractAddress}`]: sessionInfo
    });

    sendResponse({
      success: true,
      sessionId,
      contract,
      contractDetails: decompiledResponse,
      chatHistory: [
        { role: 'assistant', content: 'Thanks for uploading the decompiled code. Here’s what I found:' },
        { role: 'assistant', content: decompiledResponse }
      ],
      greeting: "Let's review your uploaded contract code."
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}


async function handleChatMessage(request, sendResponse) {
  try {
    const { message, sessionId } = request;
    const sessionInfo = sessionCache.get(sessionId);

    if (!sessionInfo) {
      sendResponse({ error: 'Session not found' });
      return;
    }

    // Send message to Nebula API
    const response = await handleUserMessage(
      message,
      sessionId,
      sessionInfo.chainId,
      sessionInfo.contractAddress
    );

    // Update last used timestamp
    sessionInfo.lastUsed = Date.now();
    sessionCache.set(sessionId, sessionInfo);

    sendResponse({
      success: true,
      response
    });

  } catch (error) {
    console.error('Error handling chat message:', error);

    // Provide fallback responses
    const fallbackResponses = [
      "I'm having trouble connecting to analyze this contract. Please try again in a moment.",
      "Sorry, I encountered an error while processing your request. Could you rephrase your question?",
      "There seems to be a temporary issue with the AI service. Please retry your query."
    ];

    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    sendResponse({
      success: false,
      error: error.message,
      fallbackResponse
    });
  }
}

function assessRiskLevel(contractData) {
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
}

function generateInitialGreeting(contract) {
  if (contract.verified) {
    const riskText = contract.riskLevel === 'low' ? 'safe' :
      contract.riskLevel === 'medium' ? 'moderately risky' : 'high risk';
    return `Hello! I'm analyzing ${contract.contractName || 'this contract'}. It's verified and appears to be ${riskText}. What would you like to know?`;
  } else {
    return `Hello! I'm ChainWhisperer. I've detected a contract. Ask me anything about it!`;
  }
}

// Fetch contract balance using RPC
async function fetchContractBalance(address, chain = 'mantle') {
  try {
    const rpcUrl = chain === 'mantle' ? 'https://rpc.mantle.xyz' : 'https://eth.llamarpc.com';

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      })
    });

    const data = await response.json();
    const balanceWei = BigInt(data.result || '0');
    const balanceEth = Number(balanceWei) / Math.pow(10, 18);
    return balanceEth.toFixed(4);
  } catch (error) {
    console.error('Error fetching balance:', error);
    return '0.0';
  }
}

// Clear cache periodically
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);

  // Clear old contract cache
  for (const [key, contract] of contractCache.entries()) {
    if (contract.timestamp < oneHourAgo && key !== 'current') {
      contractCache.delete(key);
    }
  }

  // Clear old session cache (keep sessions for 24 hours)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [key, session] of sessionCache.entries()) {
    if ((session.createdAt || session.lastUsed || 0) < oneDayAgo) {
      sessionCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Handle extension startup - restore session cache
chrome.runtime.onStartup.addListener(async () => {
  console.log('ChainWhisperer extension started - restoring session cache');

  // Restore session cache from storage
  const allStorage = await chrome.storage.local.get();
  Object.entries(allStorage).forEach(([key, value]) => {
    if (key.startsWith('session_') && value.sessionId) {
      sessionCache.set(value.sessionId, value);
      sessionCache.set(`contract_${value.contractAddress}`, value);
    }
  });
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChainWhisperer extension installed');

  // Set default badge
  chrome.action.setBadgeText({ text: '' });
  chrome.action.setTitle({ title: 'ChainWhisperer - Smart Contract Assistant' });
});