import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  connectWallet as monadConnectWallet,
  disconnectWallet as monadDisconnectWallet,
  reconnectWallet,
  getConnectedAccount,
  isWalletInstalled,
  getAccountBalance,
  formatAddress,
} from '../utils/monad';

interface WalletContextType {
  // State
  isConnected: boolean;
  address: string | null;
  balance: number;
  isConnecting: boolean;
  error: string | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  
  // Utilities
  formatAddress: (address: string) => string;
  isWalletAvailable: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWalletAvailable] = useState(isWalletInstalled());

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!address) return;
    
    try {
      const accountBalance = await getAccountBalance();
      setBalance(accountBalance.mon);
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  }, [address]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const result = await monadConnectWallet();
      setIsConnected(true);
      setAddress(result.address);
      setBalance(result.balance);
      
      // Persist connection state
      localStorage.setItem('wallet_connected', 'true');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection error:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await monadDisconnectWallet();
      setIsConnected(false);
      setAddress(null);
      setBalance(0);
      setError(null);
      
      // Clear persisted state
      localStorage.removeItem('wallet_connected');
      localStorage.removeItem('monad_pay_active_tab');
    } catch (err) {
      console.error('Wallet disconnect error:', err);
    }
  }, []);

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    const attemptReconnect = async () => {
      const wasConnected = localStorage.getItem('wallet_connected') === 'true';
      
      if (wasConnected) {
        try {
          const connectedAccount = getConnectedAccount();
          if (connectedAccount) {
            setIsConnected(true);
            setAddress(connectedAccount);
            await refreshBalance();
          } else {
            const result = await reconnectWallet();
            if (result) {
              setIsConnected(true);
              setAddress(result.address);
              setBalance(result.balance);
            } else {
              // Clear stale connection flag
              localStorage.removeItem('wallet_connected');
            }
          }
        } catch (err) {
          console.error('Failed to reconnect wallet:', err);
          localStorage.removeItem('wallet_connected');
        }
      }
    };

    attemptReconnect();
  }, [refreshBalance]);

  // Listen for MetaMask account changes
  useEffect(() => {
    if (!isWalletAvailable) return;

    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setIsConnected(true);
        setAddress(accounts[0]);
        refreshBalance();
      } else {
        disconnect();
      }
    };

    const handleChainChanged = () => {
      // Reload the page on chain change as recommended by MetaMask
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [isWalletAvailable, disconnect, refreshBalance]);

  // Refresh balance periodically when connected
  useEffect(() => {
    if (!isConnected || !address) return;

    const intervalId = setInterval(refreshBalance, 30000); // Every 30 seconds

    return () => clearInterval(intervalId);
  }, [isConnected, address, refreshBalance]);

  const value: WalletContextType = {
    isConnected,
    address,
    balance,
    isConnecting,
    error,
    connect,
    disconnect,
    refreshBalance,
    formatAddress,
    isWalletAvailable,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
};

// Re-export for backward compatibility
export { WalletContext };
