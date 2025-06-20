export default class Decompiler {
  constructor(apiUrl) {
    this.apiUrl = apiUrl.endsWith('/')
      ? apiUrl.slice(0, -1)
      : apiUrl;
  }

  /**
   * Decompile bytecode using the hosted Panoramix API.
   * @param {string} bytecode - The EVM bytecode string.
   * @returns {Promise<string>} Decompiled source code.
   */
  async decompileBytecode(bytecode) {
    if (!bytecode || typeof bytecode !== 'string') {
      throw new Error('Bytecode must be a non-empty string.');
    }

    const res = await fetch(`${this.apiUrl}/decompile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bytecode })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Decompilation failed: ${error}`);
    }

    const { source } = await res.json();
    return source;
  }

  /**
   * Decompile contract by address via RPC.
   * @param {string} address - The contract address.
   * @param {string} rpc - The EVM-compatible JSON-RPC endpoint.
   * @returns {Promise<string>} Decompiled source code.
   */
  async decompileAddress(address, rpc) {
    if (!address || !rpc) {
      throw new Error('Address and RPC URL are required.');
    }

    const res = await fetch(`${this.apiUrl}/decompile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, rpc })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Decompilation failed: ${error}`);
    }

    const { source } = await res.json();
    return source;
  }
}
