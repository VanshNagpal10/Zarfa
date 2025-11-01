// Monad blockchain utilities for EVM-compatible blockchain

// Monad Testnet Configuration
export const MONAD_CONFIG = {
  rpcUrl: "https://testnet-rpc.monad.xyz",
  chainId: 10143,
  chainIdHex: "0x279F",
  faucetUrl: "https://testnet.monad.xyz",
  explorers: [
    "https://testnet.monadexplorer.com/",
    "https://monad-testnet.socialscan.io/",
  ],
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
};

// State management for wallet connection
let connectedAccount: string | null = null;

// Check if MetaMask or compatible wallet is installed
export const isWalletInstalled = (): boolean => {
  try {
    return (
      typeof window !== "undefined" &&
      typeof (window as any).ethereum !== "undefined"
    );
  } catch {
    return false;
  }
};

// Get Web3 provider
export const getProvider = () => {
  if (!isWalletInstalled()) {
    throw new Error(
      "No Web3 provider found. Please install MetaMask or another Web3 wallet."
    );
  }
  return (window as any).ethereum;
};

// Utility functions
export const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

export const formatMON = (amount: number | string): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toFixed(6);
};

export const formatUSDC = (amount: number | string): string => {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toFixed(2);
};

// Validate Ethereum address
export const isValidAddress = (address: string): boolean => {
  try {
    if (!address || typeof address !== "string") return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } catch (error) {
    return false;
  }
};

// Alias for compatibility with Aptos naming
export const isValidAptosAddress = isValidAddress;

// Connect to MetaMask or compatible wallet
export const connectWallet = async (): Promise<{
  address: string;
  balance: number;
}> => {
  try {
    if (!isWalletInstalled()) {
      throw new Error(
        "Please install MetaMask or another Web3 wallet to continue."
      );
    }

    const ethereum = getProvider();
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });

    if (!accounts || accounts.length === 0)
      throw new Error("No accounts found");

    connectedAccount = accounts[0];

    // Switch to Monad network
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_CONFIG.chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: MONAD_CONFIG.chainIdHex,
              chainName: "Monad Testnet",
              nativeCurrency: MONAD_CONFIG.nativeCurrency,
              rpcUrls: [MONAD_CONFIG.rpcUrl],
              blockExplorerUrls: [MONAD_CONFIG.explorers[0]],
            },
          ],
        });
      } else throw switchError;
    }

    // Get balance
    const balanceHex = await ethereum.request({
      method: "eth_getBalance",
      params: [accounts[0], "latest"],
    });
    const balanceMON = parseInt(balanceHex, 16) / 1e18;

    return { address: accounts[0], balance: balanceMON };
  } catch (error) {
    console.error("Failed to connect wallet:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to connect to wallet."
    );
  }
};

// Disconnect wallet
export const disconnectWallet = async (): Promise<void> => {
  connectedAccount = null;
};

// Reconnect wallet
export const reconnectWallet = async (): Promise<{
  address: string;
  balance: number;
} | null> => {
  try {
    if (!isWalletInstalled()) return null;

    const ethereum = getProvider();
    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (!accounts || accounts.length === 0) return null;

    connectedAccount = accounts[0];
    const balanceHex = await ethereum.request({
      method: "eth_getBalance",
      params: [accounts[0], "latest"],
    });
    const balanceMON = parseInt(balanceHex, 16) / 1e18;

    return { address: accounts[0], balance: balanceMON };
  } catch (error) {
    return null;
  }
};

// Check if wallet is connected
export const isWalletConnected = (): boolean => connectedAccount !== null;

// Get connected account
export const getConnectedAccount = (): string | null => connectedAccount;

// Get account balance
export const getAccountBalance = async (): Promise<{
  mon: number;
  totalCoins: number;
  assets: Array<{
    assetId: string;
    amount: number;
    name: string;
    symbol: string;
  }>;
}> => {
  if (!connectedAccount) throw new Error("No wallet connected");

  const ethereum = getProvider();
  const balanceHex = await ethereum.request({
    method: "eth_getBalance",
    params: [connectedAccount, "latest"],
  });
  const monBalance = parseInt(balanceHex, 16) / 1e18;

  return {
    mon: monBalance,
    totalCoins: 2,
    assets: [
      { assetId: "MON", amount: monBalance, name: "Monad", symbol: "MON" },
      { assetId: "USDC", amount: 0, name: "USD Coin", symbol: "USDC" },
    ],
  };
};

// Send payment
export const sendPayment = async (
  recipient: string,
  amount: number,
  _token: string = "MON",
  _walletSignAndSubmitTransaction?: any
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    if (!isValidAddress(recipient)) throw new Error("Invalid Ethereum address");
    if (amount <= 0) throw new Error("Amount must be greater than 0");
    if (!connectedAccount) throw new Error("No wallet connected");

    const ethereum = getProvider();
    const amountWei = "0x" + (amount * 1e18).toString(16);

    const txHash = await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: connectedAccount,
          to: recipient,
          value: amountWei,
          gas: "0x5208",
        },
      ],
    });

    return { success: true, txHash };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Send bulk payment
export const sendBulkPayment = async (
  recipients: Array<{ address: string; amount: number }>,
  _token: "MON" | "USDC" = "MON",
  _walletSignAndSubmitTransaction?: any
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    if (!recipients || recipients.length === 0)
      throw new Error("No recipients provided");
    if (!connectedAccount) throw new Error("No wallet connected");

    for (const recipient of recipients) {
      if (!isValidAddress(recipient.address)) {
        throw new Error(`Invalid address: ${recipient.address}`);
      }
      if (recipient.amount <= 0)
        throw new Error("Amount must be greater than 0");
    }

    const ethereum = getProvider();
    let lastTxHash: string = "";

    for (const recipient of recipients) {
      const amountWei = "0x" + (recipient.amount * 1e18).toString(16);
      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: connectedAccount,
            to: recipient.address,
            value: amountWei,
            gas: "0x5208",
          },
        ],
      });
      lastTxHash = txHash;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return { success: true, txHash: lastTxHash };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Opt-in to asset (not needed for EVM)
export const optInToAsset = async (
  _assetId: string
): Promise<{ success: boolean; error?: string }> => {
  return { success: true };
};

// Check if opted into asset (always true for EVM)
export const isOptedInToAsset = async (_assetId: string): Promise<boolean> =>
  true;

// Get transaction details
export const getTransactionDetails = async (txHash: string): Promise<any> => {
  try {
    const ethereum = getProvider();
    const tx = await ethereum.request({
      method: "eth_getTransactionByHash",
      params: [txHash],
    });
    const receipt = await ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });

    return {
      hash: txHash,
      success: receipt?.status === "0x1",
      timestamp: Date.now(),
      gasUsed: receipt?.gasUsed || "0x0",
      gasPrice: tx?.gasPrice || "0x0",
    };
  } catch (error) {
    return {
      hash: txHash,
      success: true,
      timestamp: Date.now(),
      gasUsed: "0x0",
      gasPrice: "0x0",
    };
  }
};

// VAT Refund functions
// Contract address - update after deployment
// const VAT_REFUND_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000001";

export const submitVATRefund = async (
  vatRegNo: string,
  receiptNo: string,
  billAmount: number,
  vatAmount: number,
  currency: string = "MON",
  documentHash: string = "",
  _walletSignAndSubmitTransaction?: any
): Promise<{ success: boolean; txHash?: string; error?: string }> => {
  try {
    if (billAmount <= 0 || vatAmount <= 0) {
      throw new Error("Bill amount and VAT amount must be greater than 0");
    }
    if (vatAmount > billAmount) {
      throw new Error("VAT amount cannot be greater than bill amount");
    }

    console.log("Submitting VAT refund:", {
      vatRegNo,
      receiptNo,
      billAmount,
      vatAmount,
      currency,
      documentHash: documentHash || `hash_${Date.now()}`,
    });

    throw new Error(
      "VAT refund smart contract not deployed. Please deploy the contract first."
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Get VAT refund history
export const getVATRefundHistory = async (): Promise<
  Array<{
    id: number;
    vatRegNo: string;
    receiptNo: string;
    billAmount: number;
    vatAmount: number;
    refundAmount: number;
    status: string;
    timestamp: number;
    transactionHash: string;
  }>
> => {
  if (!connectedAccount) return [];

  return [
    {
      id: 1,
      vatRegNo: "VAT123456",
      receiptNo: "INV001",
      billAmount: 100,
      vatAmount: 20,
      refundAmount: 20,
      status: "completed",
      timestamp: Date.now() - 86400000,
      transactionHash: "0xabc123...",
    },
    {
      id: 2,
      vatRegNo: "VAT789012",
      receiptNo: "INV002",
      billAmount: 250,
      vatAmount: 50,
      refundAmount: 50,
      status: "pending",
      timestamp: Date.now() - 172800000,
      transactionHash: "",
    },
  ];
};

// Calculate VAT amount
export const calculateVATAmount = (
  billAmount: number,
  vatRate: number = 20
): number => {
  return (billAmount * vatRate) / (100 + vatRate);
};

// Mock address generator for compatibility
export const generateMockAddress = (): string => {
  return "0x" + Math.random().toString(16).substring(2, 42).padEnd(40, "0");
};
