import React, { useEffect } from 'react';
import WalletConnect from './components/WalletConnect';
import CircuitCall from './components/CircuitCall';
import { useMidnight } from './hooks/useMidnight';

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at top, #16213e 0%, #0f0f1e 70%)',
  color: '#e0e0e0',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  padding: '24px',
  boxSizing: 'border-box',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 0 8px 0',
  borderBottom: '1px solid #2a2a4e',
  marginBottom: '40px',
  flexWrap: 'wrap',
  gap: '16px',
};

const brandStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  background: 'linear-gradient(90deg, #6bcbff 0%, #a06bff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8a8aae',
  marginTop: '4px',
  letterSpacing: '0.04em',
};

const mainStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '24px',
  paddingBottom: '40px',
};

const heroPromptStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 24px',
  maxWidth: '560px',
  color: '#a0a0c0',
};

const heroButtonStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '14px 28px',
  background: '#6bcbff',
  color: '#0f0f1e',
  border: 'none',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
};

const errorBannerStyle: React.CSSProperties = {
  background: '#ff6b6b20',
  border: '1px solid #ff6b6b50',
  color: '#ff6b6b',
  padding: '12px 16px',
  borderRadius: '10px',
  fontSize: '13px',
  maxWidth: '560px',
  textAlign: 'center',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const footerStyle: React.CSSProperties = {
  marginTop: '40px',
  fontSize: '13px',
  color: '#6a6a8e',
  textAlign: 'center',
  paddingBottom: '24px',
};

const App: React.FC = () => {
  const {
    walletState,
    address,
    connect,
    disconnect,
    count,
    increment,
    decrement,
    reset,
    refreshCount,
    loading,
    result,
    error,
    clearError,
  } = useMidnight();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 15000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const contractAddress = (() => {
    const v = import.meta.env.VITE_DEFAULT_CONTRACT as string | undefined;
    if (!v || !v.trim() || /^PLACEHOLDER/i.test(v)) return null;
    return v.trim();
  })();

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={brandStyle}>VeilWork</h1>
          <p style={subtitleStyle}>Midnight Counter DApp · Privacy by Zero-Knowledge</p>
        </div>
        <WalletConnect
          walletState={walletState}
          address={address}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </header>

      <main style={mainStyle}>
        {error && <div style={errorBannerStyle}>⚠ {error}</div>}

        {walletState !== 'connected' && (
          <div style={heroPromptStyle}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0', color: '#e0e0e0' }}>
              Connect your Midnight wallet
            </h2>
            <p style={{ fontSize: '15px', lineHeight: 1.6 }}>
              Lace wallet injects the DApp Connector API at <code style={{ color: '#6bcbff' }}>window.midnight</code>.
              After connecting, your browser generates a zero-knowledge proof locally —
              proving you own the counter's secret key without ever revealing it on-chain.
            </p>
            <button onClick={connect} style={heroButtonStyle}>Connect Wallet</button>
            {!contractAddress && (
              <p style={{ marginTop: '20px', fontSize: '12px', color: '#6a6a8e' }}>
                <em>Tip:</em> Set <code>VITE_DEFAULT_CONTRACT</code> in <code>.env.preprod</code> after deploying.
              </p>
            )}
          </div>
        )}

        {walletState === 'connected' && (
          <>
            {!contractAddress && (
              <div style={{ ...errorBannerStyle, color: '#a0a0c0', background: 'transparent', border: '1px dashed #4a4a6e' }}>
                No contract address configured. Set <code>VITE_DEFAULT_CONTRACT</code> in <code>.env.preprod</code>.
              </div>
            )}
            <CircuitCall
              count={count}
              loading={loading}
              result={result}
              disabled={walletState !== 'connected' || !contractAddress}
              onIncrement={increment}
              onDecrement={decrement}
              onReset={reset}
              onRefresh={refreshCount}
            />
          </>
        )}
      </main>

      <footer style={footerStyle}>
        VeilWork · Midnight Builder Challenge · New Moon to Full bootcamp · Level 2 (Waxing Crescent)
      </footer>
    </div>
  );
};

export default App;
