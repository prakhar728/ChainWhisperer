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
      console.log('Contract detected:', this.contractAddress);
      
      // Send to background script
      chrome.runtime.sendMessage({
        type: 'CONTRACT_DETECTED',
        address: this.contractAddress,
        chain: url.includes('mantlescan') ? 'mantle' : 'ethereum'
      });

      // Add visual indicator
      this.addIndicator();
    }
  }

  addIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'chainwhisperer-indicator';
    indicator.innerHTML = '🤖 ChainWhisperer Active';
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
    
    indicator.onclick = () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    };
    
    document.body.appendChild(indicator);
  }
}

new ContractDetector();