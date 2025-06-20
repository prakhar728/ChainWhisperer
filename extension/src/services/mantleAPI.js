const DEFAULT_MANTLE_MAINNET = 'https://api.mantlescan.xyz/api';
const DEFAULT_MANTLE_SEPOLIA = 'https://api-sepolia.mantlescan.xyz/api';

const MANTLE_API_KEY = process.env.MANTLE_API_KEY;

export class MantleAPI {
  constructor(apiKey = MANTLE_API_KEY, chainId = 5000) {
    
    this.apiKey = apiKey;
    this.baseUrl = chainId == 5000
      ? DEFAULT_MANTLE_MAINNET
      : chainId == 5003
      ? DEFAULT_MANTLE_SEPOLIA
      : DEFAULT_MANTLE_MAINNET;
  }

  async getVerifiedContract(address) {
    try {
      // Get contract source code and ABI
      const response = await fetch(
        `${this.baseUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${this.apiKey}`
      );
    
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === '0') {
        console.log('Contract not verified:', data.result);
        return {
          verified: false,
          address,
          message: data.result
        };
      }
      
      // Parse the result
      const contractData = data.result[0];

      return {
        verified: true,
        address,
        contractName: contractData.ContractName,
        compilerVersion: contractData.CompilerVersion,
        optimizationUsed: contractData.OptimizationUsed === '1',
        runs: parseInt(contractData.Runs) || 200,
        sourceCode: contractData.SourceCode,
        abi: contractData.ABI && contractData.ABI != "Contract source code not verified" ? JSON.parse(contractData.ABI) : null,
        constructorArguments: contractData.ConstructorArguments || "",
        evmVersion: contractData.EVMVersion,
        library: contractData.Library,
        licenseType: contractData.LicenseType,
        proxy: contractData.Proxy === '1',
        implementation: contractData.Implementation || null,
        swarmSource: contractData.SwarmSource
      };
    } catch (error) {
      console.error('Error fetching verified contract:', error);
      return {
        verified: false,
        address,
        error: error.message
      };
    }
  }

  async getContractABI(address) {
    try {
      const response = await fetch(
        `${this.baseUrl}?module=contract&action=getabi&address=${address}&apikey=${this.apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === '1') {
        return JSON.parse(data.result);
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching ABI:', error);
      return null;
    }
  }

  async getContractCreation(address) {
    try {
      const response = await fetch(
        `${this.baseUrl}?module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${this.apiKey}`
      );
      
      const data = await response.json();
      
      if (data.status === '1' && data.result.length > 0) {
        return {
          creator: data.result[0].contractCreator,
          txHash: data.result[0].txHash
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching contract creation:', error);
      return null;
    }
  }

  async getBytecode(address) {
  const response = await fetch('https://rpc.sepolia.mantle.xyz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getCode',
      params: [address, 'latest'],
      id: 1
    })
  });

  const { result } = await response.json();

  if (!result || result === '0x') {
    throw new Error(`No bytecode found at address ${address}`);
  }

  return result; // hex string
}

}

export default MantleAPI;