/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { PricePulseProvider } from "./context/PricePulseContext";
import { ToastContainer } from "./components/ToastContainer";
import { RealtimeMarketStreamManager } from "./components/RealtimeMarketStreamManager";
import { MultiModelSecuritiesConsensusModal } from "./components/MultiModelSecuritiesConsensusModal";
import { AiBotCommandCenterUi } from "./components/AiBotCommandCenterUi";
import { ErrorBoundary } from "./components/ErrorBoundary";

function MainLayout() {
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState<boolean>(false);
  const [consensusSelectedSymbol, setConsensusSelectedSymbol] = useState<string>("005930");

  useEffect(() => {
    // Ensure document and body allow natural vertical scrolling
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.documentElement.style.overflow = "";

    const handleOpenConsensus = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setConsensusSelectedSymbol(customEvent.detail);
      }
      setIsConsensusModalOpen(true);
    };
    window.addEventListener("open-consensus-modal", handleOpenConsensus);

    return () => {
      window.removeEventListener("open-consensus-modal", handleOpenConsensus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <RealtimeMarketStreamManager />
      
      {/* DIRECT MASTER COMMAND CENTER TERMINAL */}
      <ErrorBoundary>
        <AiBotCommandCenterUi
          onOpenConsensusModal={(sym) => {
            setConsensusSelectedSymbol(sym);
            setIsConsensusModalOpen(true);
          }}
        />
      </ErrorBoundary>

      {/* Global Real-time Toast Notifications */}
      <ToastContainer />

      {/* AI Multi-Model Securities Consensus Modal */}
      <ErrorBoundary>
        <MultiModelSecuritiesConsensusModal
          isOpen={isConsensusModalOpen}
          onClose={() => setIsConsensusModalOpen(false)}
          initialSymbol={consensusSelectedSymbol}
          onSelectStockForTerminal={() => {
            setIsConsensusModalOpen(false);
          }}
        />
      </ErrorBoundary>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <PricePulseProvider>
          <MainLayout />
        </PricePulseProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
