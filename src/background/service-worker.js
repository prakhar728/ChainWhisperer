let currentContract = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received:', request);
  
  switch (request.type) {
    case 'CONTRACT_DETECTED':
      console.log(request);
      
      currentContract = {
        address: request.address,
        chain: request.chain,
        timestamp: Date.now()
      };
      
      // Store in extension storage
      chrome.storage.local.set({ currentContract });
      
      // Update extension badge
      chrome.action.setBadgeText({ text: '1' });
      chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
      break;
      
    case 'GET_CURRENT_CONTRACT':
      sendResponse(currentContract);
      break;
      
    case 'OPEN_POPUP':
      chrome.action.openPopup();
      break;
  }
  
  return true;
});