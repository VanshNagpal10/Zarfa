# Orbix Payment Contracts

This directory contains the Aptos Move smart contracts for the Orbix payment system.

## Contracts

### 1. Payment Processor (`payment_processor.move`)
Handles general payments including:
- Single payments (payroll, individual transfers)
- Bulk payments (mass payroll processing)
- Payment history tracking
- Event emission for transaction monitoring

### 2. VAT Refund Processor (`vat_refund.move`)
Specialized contract for VAT refund processing:
- VAT refund claim submission
- Document verification (via hash storage)
- Approval/rejection workflow
- VAT calculation utilities
- Refund statistics tracking

## Deployment

### Prerequisites
1. Install Aptos CLI: https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli
2. Create an Aptos account: `aptos init`
3. Fund your account with testnet APT: https://faucet.testnet.aptoslabs.com/

### Deploy to Testnet

```bash
# Navigate to contracts directory
cd contracts

# Compile the contracts
aptos move compile

# Deploy to testnet
aptos move publish --profile testnet

# Initialize the payment processor
aptos move run --function-id default::payment_processor::initialize --profile testnet

# Initialize the VAT refund processor  
aptos move run --function-id default::vat_refund::initialize --profile testnet
```

### Deploy to Mainnet

```bash
# Deploy to mainnet (ensure you have mainnet profile configured)
aptos move publish --profile mainnet

# Initialize contracts
aptos move run --function-id default::payment_processor::initialize --profile mainnet
aptos move run --function-id default::vat_refund::initialize --profile mainnet
```

## Contract Addresses

After deployment, update the contract addresses in your frontend configuration:

### Testnet
- Contract Address: `0x...` (update after deployment)

### Mainnet  
- Contract Address: `0x...` (update after deployment)

## Usage Examples

### Process a Single Payment

```bash
aptos move run \
  --function-id default::payment_processor::process_payment \
  --type-args 0x1::aptos_coin::AptosCoin \
  --args address:0x123... u64:1000000 string:"APT" string:"payroll" string:"emp_001" \
  --profile testnet
```

### Submit VAT Refund

```bash
aptos move run \
  --function-id default::vat_refund::submit_vat_refund \
  --args string:"VAT123456" string:"INV001" u64:10000000 u64:2000000 string:"APT" string:"doc_hash_123" \
  --profile testnet
```

### Process Bulk Payment

```bash
aptos move run \
  --function-id default::payment_processor::process_bulk_payment \
  --type-args 0x1::aptos_coin::AptosCoin \
  --args "vector<address>:[0x123..., 0x456...]" "vector<u64>:[1000000, 2000000]" string:"APT" \
  --profile testnet
```

## Testing

Run the Move unit tests:

```bash
aptos move test
```

## Integration

Update your frontend `utils/aptos.ts` to use these contract functions instead of mock implementations.

Key integration points:
1. Replace mock `sendPayment` with contract calls
2. Replace mock `sendBulkPayment` with bulk contract calls  
3. Add VAT refund submission functionality
4. Integrate payment history from contract events
5. Add proper error handling for contract failures

## Security Considerations

1. **Access Control**: Only authorized accounts can process refunds
2. **Amount Validation**: All amounts are validated before processing
3. **Event Logging**: All transactions emit events for auditing
4. **Resource Management**: Proper resource handling to prevent attacks
5. **Overflow Protection**: Safe math operations to prevent overflow

## Monitoring

Monitor contract activity through:
1. Aptos Explorer: https://explorer.aptoslabs.com
2. Event streams from the contract
3. View functions for real-time data
4. Transaction history queries