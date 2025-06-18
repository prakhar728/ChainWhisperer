const MANTLE_API_BASE = 'https://api.mantlescan.xyz/api';
const MANTLE_API_KEY = process.env.MANTLE_API_KEY; // You'll need to get this from Mantlescan

export class MantleAPI {
  constructor(apiKey = MANTLE_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = MANTLE_API_BASE;
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
      console.log(contractData);
      
      return {
        verified: true,
        address,
        contractName: contractData.ContractName,
        compilerVersion: contractData.CompilerVersion,
        optimizationUsed: contractData.OptimizationUsed === '1',
        runs: parseInt(contractData.Runs) || 200,
        sourceCode: contractData.SourceCode,
        abi: contractData.ABI ? JSON.parse(contractData.ABI) : null,
        constructorArguments: contractData.ConstructorArguments,
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
}

export default MantleAPI;