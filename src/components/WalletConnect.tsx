import React from 'react';

export interface WalletConnectProps {
  walletState: 'detecting' | 'no-wallet' | 'ready' | 'connecting' | 'connected';
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '12px 16px',
  background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)',
  borderRadius: '12px',
  border: '1px solid #2a2a4e',
  minWidth: '220px',
  color: '#e0e0e0',
};

const btnStyle: React.CSSProperties = {
  background: '#6bcbff',
  color: '#0f0f1e',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s ease',
};

const btnOutlineStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#e0e0e0',
  border: '1px solid #4a4a6e',
  borderRadius: '8px',
  padding: '6px 12px',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease',
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '14px',
  height: '14px',
  border: '2px solid #6bcbff80',
  borderTopColor: '#6bcbff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const truncate = (addr: string): string =>
  addr.length <= 24 ? addr : `${addr.slice(0, 14)}...${addr.slice(-8)}`;

const WalletConnect: React.FC<WalletConnectProps> = ({
  walletState,
  address,
  onConnect,
  onDisconnect,
}) => {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={cardStyle}>
        {walletState === 'detecting' && (
          <p style={{ margin: 0, fontSize: '14px', color: '#a0a0c0' }}>
            <span style={spinnerStyle} /> Detecting wallet…
          </p>
        )}
        {walletState === 'no-wallet' && (
          <p style={{ margin: 0, fontSize: '13px', color: '#ff6b6b' }}>
            No Midnight wallet found. Install{' '}
            <a
              href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#6bcbff' }}
            >
              Lace wallet
            </a>
            .
          </p>
        )}
        {walletState === 'ready' && (
          <button onClick={onConnect} style={btnStyle}>Connect Wallet</button>
        )}
        {walletState === 'connecting' && (
          <button disabled style={{ ...btnStyle, opacity: 0.6, cursor: 'default' }}>
            <span style={spinnerStyle} /> Connecting…
          </button>
        )}
        {walletState === 'connected' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              title={address ?? ''}
              style={{
                fontVariant: 'numeric',
                fontSize: '14px',
                color: '#6bcbff',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {truncate(address ?? '')}
            </span>
            <button onClick={onDisconnect} style={btnOutlineStyle}>Disconnect</button>
          </div>
        )}
      </div>
    </>
  );
};

export default WalletConnect;
