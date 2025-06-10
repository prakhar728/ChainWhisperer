import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const MANTLE_RPC = 'https://rpc.mantle.xyz';

function App() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractInfo, setContractInfo] = useState(null);

  useEffect(() => {
    // Get current contract from background
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
      const provider = new ethers.JsonRpcProvider(MANTLE_RPC);
      
      // Get basic info
      const code = await provider.getCode(contractData.address);
      const balance = await provider.getBalance(contractData.address);
      
      setContractInfo({
        isContract: code !== '0x',
        balance: ethers.formatEther(balance),
        codeSize: (code.length - 2) / 2 // bytes
      });
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 rounded-full border-t-transparent mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading contract data...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-gray-600">No contract detected</p>
          <p className="text-sm text-gray-400 mt-2">Visit a contract page on Etherscan or Mantlescan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <h1 className="text-lg font-semibold text-gray-900">ChainWhisperer</h1>
        <p className="text-sm text-gray-500 truncate">
          {contract.address}
        </p>
      </div>

      {/* Contract Info */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-medium text-gray-900 mb-3">Contract Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Network:</span>
              <span className="font-medium">Mantle</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="font-medium">
                {contractInfo?.isContract ? 'Smart Contract' : 'EOA'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Balance:</span>
              <span className="font-medium">{contractInfo?.balance} MNT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Code Size:</span>
              <span className="font-medium">{contractInfo?.codeSize} bytes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface Placeholder */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow h-full p-4">
          <p className="text-gray-500 text-center">Chat interface coming next...</p>
        </div>
      </div>
    </div>
  );
}

export default App;