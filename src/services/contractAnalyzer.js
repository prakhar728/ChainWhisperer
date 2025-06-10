import { ethers } from 'ethers';

export class ContractAnalyzer {
  constructor(provider) {
    this.provider = provider;
  }

  async analyzeContract(address) {
    const analysis = {
      address,
      basic: await this.getBasicInfo(address),
      abi: await this.fetchABI(address),
      risks: []
    };

    if (analysis.abi) {
      analysis.functions = this.analyzeFunctions(analysis.abi);
      analysis.risks = this.detectRisks(analysis.abi);
    }

    return analysis;
  }

  async getBasicInfo(address) {
    const [code, balance] = await Promise.all([
      this.provider.getCode(address),
      this.provider.getBalance(address)
    ]);

    return {
      isContract: code !== '0x',
      balance: ethers.formatEther(balance),
      codeSize: (code.length - 2) / 2
    };
  }

  async fetchABI(address) {
    // Try Mantlescan API first
    try {
      const response = await fetch(
        `https://api.mantlescan.xyz/api?module=contract&action=getabi&address=${address}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === '1') {
          return JSON.parse(data.result);
        }
      }
    } catch (error) {
      console.error('Error fetching ABI:', error);
    }

    // Return a basic interface if ABI not found
    return this.generateBasicABI();
  }

  analyzeFunctions(abi) {
    return abi
      .filter(item => item.type === 'function')
      .map(func => ({
        name: func.name,
        inputs: func.inputs,
        outputs: func.outputs,
        stateMutability: func.stateMutability,
        risk: this.assessFunctionRisk(func)
      }));
  }

  detectRisks(abi) {
    const risks = [];

    // Check for dangerous functions
    const dangerous = ['selfdestruct', 'destroy', 'kill'];
    const hasDangerous = abi.some(f => 
      dangerous.includes(f.name?.toLowerCase())
    );
    if (hasDangerous) {
      risks.push({
        level: 'critical',
        message: 'Contract can be destroyed'
      });
    }

    // Check for upgradeable
    const upgradeable = ['upgradeTo', 'upgradeToAndCall'];
    const isUpgradeable = abi.some(f => 
      upgradeable.includes(f.name)
    );
    if (isUpgradeable) {
      risks.push({
        level: 'high',
        message: 'Contract is upgradeable'
      });
    }

    // Check for approve functions
    const hasApprove = abi.some(f => f.name === 'approve');
    if (hasApprove) {
      risks.push({
        level: 'medium',
        message: 'Contains token approval functions'
      });
    }

    return risks;
  }

  assessFunctionRisk(func) {
    if (func.name?.toLowerCase().includes('withdraw')) {
      return 'high';
    }
    if (func.stateMutability === 'payable') {
      return 'medium';
    }
    if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
      return 'low';
    }
    return 'medium';
  }

  generateBasicABI() {
    // Common function signatures
    return [
      {
        type: 'function',
        name: 'unknown',
        inputs: [],
        outputs: [],
        stateMutability: 'unknown'
      }
    ];
  }
}