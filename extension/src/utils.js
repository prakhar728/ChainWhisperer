export function getChainId(chain) {
  switch (chain) {
    case 'mantle':
      return '5000';
    case 'mantle-sepolia':
      return '5003';
    case 'ethereum':
    default:
      return '1';
  }
}
