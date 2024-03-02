import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DerivedKeyCtxType {
  derivedKey: CryptoKey | null;
  setDerivedKey: (value: CryptoKey) => void;
}
interface DerivedKeyProviderProps {
  children: ReactNode;
}

const DerivedKeyCtx = createContext<DerivedKeyCtxType | undefined>(undefined);

export const DerivedKeyProvider: React.FC<DerivedKeyProviderProps> = ({ children }) => {
  const [derivedKey, setDerivedKey] = useState<CryptoKey | null>(null);

  return (
    <DerivedKeyCtx.Provider value={{ derivedKey, setDerivedKey }}>
      {children}
    </DerivedKeyCtx.Provider>
  );
};

export const useDerivedKey = (): DerivedKeyCtxType => {
  const context = useContext(DerivedKeyCtx);
  if (!context) {
    throw new Error('useDerivedKey must be used within a DerivedKeyProvider');
  }
  return context;
};
