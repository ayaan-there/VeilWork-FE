import React from 'react';

export interface CircuitCallProps {
  count: bigint | null;
  loading: boolean;
  result: string | null;
  disabled: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

const container: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '20px',
  padding: '32px',
  background: 'linear-gradient(160deg, #16213e 0%, #1a1a2e 100%)',
  borderRadius: '16px',
  border: '1px solid #2a2a4e',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  minWidth: '380px',
  color: '#e0e0e0',
};

const countDisplay: React.CSSProperties = {
  fontSize: '72px',
  fontWeight: 700,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  color: '#6bcbff',
  lineHeight: 1,
  margin: '0 0 8px 0',
  textShadow: '0 0 24px rgba(107,203,255,0.35)',
};

const countLabel: React.CSSProperties = {
  fontSize: '13px',
  color: '#8a8aae',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  margin: 0,
};

const buttonRow: React.CSSProperties = { display: 'flex', gap: '12px' };

const primaryBtn: React.CSSProperties = {
  background: '#6bcbff',
  color: '#0f0f1e',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 20px',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'transform 0.1s ease, opacity 0.15s ease',
};

const dangerBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'transparent',
  color: '#ff6b6b',
  border: '1px solid #ff6b6b80',
};

const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'transparent',
  color: '#e0e0e0',
  border: '1px solid #4a4a6e',
};

const spinnerAndText: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '14px',
  color: '#a0a0c0',
};

const proveBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 12px',
  background: 'rgba(107,203,255,0.12)',
  border: '1px solid #6bcbff40',
  borderRadius: '999px',
  fontSize: '13px',
  color: '#6bcbff',
  fontWeight: 600,
};

const txInfo: React.CSSProperties = {
  fontSize: '12px',
  color: '#8a8aae',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  wordBreak: 'break-all' as const,
  maxWidth: '420px',
  textAlign: 'center' as const,
};

const checkmark = '\u2713';

const CircuitCall: React.FC<CircuitCallProps> = ({
  count,
  loading,
  result,
  disabled,
  onIncrement,
  onDecrement,
  onReset,
  onRefresh,
}) => {
  const btnDisabled = disabled || loading;
  const render = (style: React.CSSProperties): React.CSSProperties => ({
    ...style,
    cursor: btnDisabled ? 'default' : 'pointer',
    opacity: btnDisabled ? 0.45 : 1,
  });

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={container}>
        <div style={{ textAlign: 'center' }}>
          <p style={countLabel}>Counter · Public Ledger</p>
          <p style={countDisplay}>{count == null ? '—' : count.toString()}</p>
        </div>

        {loading && (
          <div style={spinnerAndText}>
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid #6bcbff80',
                borderTopColor: '#6bcbff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Generating proof…</span>
          </div>
        )}

        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <span style={proveBadge}>
              <span aria-hidden>{checkmark}</span> Proved without revealing your input
            </span>
            <span style={txInfo}>{result}</span>
          </div>
        )}

        <div style={buttonRow}>
          <button onClick={onDecrement} disabled={btnDisabled} style={render(dangerBtn)}>
            − Decrement
          </button>
          <button onClick={onIncrement} disabled={btnDisabled} style={render(primaryBtn)}>
            + Increment
          </button>
          <button onClick={onReset} disabled={btnDisabled} style={render(ghostBtn)}>
            Reset
          </button>
        </div>

        <button onClick={onRefresh} disabled={disabled} style={render(ghostBtn)}>
          ↻ Refresh count
        </button>
      </div>
    </>
  );
};

export default CircuitCall;
