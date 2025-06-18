console.log('ChainWhisperer: Content script loaded');

class ContractDetector {
  constructor() {
    this.contractAddress = null;
    this.detectContract();
  }

  detectContract() {
    const url = window.location.href;
    const addressMatch = url.match(/address\/(0x[a-fA-F0-9]{40})/);
    
    if (addressMatch) {
      this.contractAddress = addressMatch[1];

      chrome.runtime.sendMessage({
        type: 'CONTRACT_DETECTED',
        address: this.contractAddress,
        chain: url.includes('mantle') ? 'mantle' : 'ethereum',
        fetchVerified: true // New flag to trigger immediate fetch
      });

      // Add visual indicator
      this.addIndicator();
      
      // Also try to extract some info from the page
      this.extractPageInfo();
    }
  }

  extractPageInfo() {
    // Try to grab contract name from the page if available
    setTimeout(() => {
      const contractNameElement = document.querySelector('.text-secondary.small');
      const contractName = contractNameElement?.textContent?.trim();
      
      if (contractName) {
        chrome.runtime.sendMessage({
          type: 'CONTRACT_PAGE_INFO',
          address: this.contractAddress,
          contractName
        });
      }
    }, 1000);
  }

  addIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'chainwhisperer-indicator';
    indicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>Analyzing Contract...</span>
      </div>
    `;
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #6366f1;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      z-index: 9999;
      cursor: pointer;
      font-family: sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    
    // Add spinning animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    indicator.onclick = () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    };
    
    document.body.appendChild(indicator);
  }

  updateIndicator(status, message) {
    const indicator = document.getElementById('chainwhisperer-indicator');
    if (indicator) {
      indicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          ${status === 'success' ? '✅' : status === 'error' ? '❌' : '🤖'}
          <span>${message}</span>
        </div>
      `;
    }
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_INDICATOR') {
    const detector = window.chainWhispererDetector;
    if (detector) {
      detector.updateIndicator(request.status, request.message);
    }
  }
});

// Create global instance
window.chainWhispererDetector = new ContractDetector();