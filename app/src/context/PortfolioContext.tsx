import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TempAllocation {
  symbol: string;
  mint: string;
  targetPct: number;
  currentPct?: number;
}

export interface TempPortfolioData {
  allocations: TempAllocation[];
  totalValue: number;
  isTemporary: boolean;
  lastUpdated: Date;
}

interface PortfolioContextType {
  tempPortfolio: TempPortfolioData | null;
  setTempPortfolio: (portfolio: TempPortfolioData | null) => void;
  updateTempAllocation: (allocations: TempAllocation[]) => void;
  clearTempPortfolio: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const usePortfolioContext = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
};

interface PortfolioProviderProps {
  children: ReactNode;
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [tempPortfolio, setTempPortfolioState] = useState<TempPortfolioData | null>(null);

  const setTempPortfolio = (portfolio: TempPortfolioData | null) => {
    setTempPortfolioState(portfolio);
  };

  const updateTempAllocation = (allocations: TempAllocation[]) => {
    const newPortfolio: TempPortfolioData = {
      allocations,
      totalValue: 0, // Mock value for temporary portfolio
      isTemporary: true,
      lastUpdated: new Date(),
    };
    setTempPortfolioState(newPortfolio);
  };

  const clearTempPortfolio = () => {
    setTempPortfolioState(null);
  };

  return (
    <PortfolioContext.Provider
      value={{
        tempPortfolio,
        setTempPortfolio,
        updateTempAllocation,
        clearTempPortfolio,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};