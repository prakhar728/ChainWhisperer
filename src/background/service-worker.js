// src/background/service-worker.js
import MantleAPI from '../services/mantleAPI.js';

const mantleAPI = new MantleAPI();
let contractCache = new Map();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'CONTRACT_DETECTED':
      handleContractDetected(request, sender.tab);
      break;
      
    case 'GET_CURRENT_CONTRACT':
      const cached = contractCache.get(request.address || 'current');
      sendResponse(cached || null);
      break;
      
    case 'OPEN_POPUP':
      chrome.action.openPopup();
      break;
  }
  
  return true;
});

async function handleContractDetected(request, tab) {
  const { address, chain, fetchVerified } = request;
  
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
  
  if (fetchVerified && chain === 'mantle') {
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
      
      // Update contract info
      const enrichedContract = {
        ...contractInfo,
        ...verifiedData,
        creation: creationData,
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
      
      // Log for debugging
      console.log('Contract data fetched:', enrichedContract);
      
    } catch (error) {
      console.error('Error fetching contract:', error);
      
      // Update with error state
      const errorContract = {
        ...contractInfo,
        loading: false,
        error: error.message
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

// Clear cache periodically (optional)
setInterval(() => {
  // Keep only recent contracts (last hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (const [key, contract] of contractCache.entries()) {
    if (contract.timestamp < oneHourAgo && key !== 'current') {
      contractCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes