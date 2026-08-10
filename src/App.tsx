import React, { useEffect, useState } from 'react';
import { useMidnight } from './hooks/useMidnight';
import TrueFocus from './components/TrueFocus';
import DotField from './components/DotField';

const NETWORK = (() => {
  const v = import.meta.env.VITE_NETWORK_ID as string | undefined;
  return (v && v.trim()) || 'preview';
})();

const CONTRACT = (() => {
  const v = import.meta.env.VITE_DEFAULT_CONTRACT as string | undefined;
  if (!v || !v.trim() || /^PLACEHOLDER/i.test(v)) return null;
  return v.trim();
})();

const truncateHex = (s: string, head = 12, tail = 8): string =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

const SENTENCES = ['PROVE WITHOUT', 'REVEALING'];

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

  const [sentenceIndex, setSentenceIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setSentenceIndex((i) => (i + 1) % SENTENCES.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(clearError, 9000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  const isConnected = walletState === 'connected';
  const isConnecting = walletState === 'connecting';
  const isDetecting = walletState === 'detecting';
  const noWallet = walletState === 'no-wallet';
  const isReady = walletState === 'ready' || isConnected;

  const actionLabel = isConnecting
    ? 'CONNECTING…'
    : isDetecting || noWallet
      ? 'AWAITING LACE'
      : 'CONNECT LACE';

  const primaryAction = isConnected
    ? undefined
    : () => {
        void connect();
      };

  const privateUnlocked = isConnected;
  const proofInProgress = loading && isConnected;

  type StepState = 'pending' | 'active' | 'done';
  const step1: StepState = isConnected ? 'done' : 'pending';
  const step2: StepState = proofInProgress ? 'active' : isConnected ? 'done' : 'pending';
  const step3: StepState = result && !loading ? 'done' : 'pending';

  const resultStatus = !isConnected
    ? 'NOT VERIFIED'
    : proofInProgress
      ? 'PROVING…'
      : result
        ? 'VERIFIED'
        : 'READY';

  const resultColor = result && !loading ? 'var(--color-primary)' : 'var(--color-secondary)';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
        color: 'var(--color-on-surface)',
      }}
    >
      <nav
        style={{
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '16px 32px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            className="mono"
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-primary)',
            }}
          >
            ANONITY
          </span>
          <span
            className="caps"
            style={{ color: 'var(--color-on-surface-variant)', display: 'none' }}
          >
            / PRIVATE REPUTATION PROTOCOL
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span
            className="caps"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--color-on-surface-variant)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isConnected ? 'var(--color-primary)' : 'var(--color-secondary-container)',
              }}
            />
            MIDNIGHT / {NETWORK.toUpperCase()}
          </span>
          {isConnected ? (
            <button
              className="btn-secondary"
              onClick={disconnect}
              title={address ?? ''}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.04em',
                  textTransform: 'none',
                }}
              >
                {truncateHex(address ?? '', 14, 6)}
              </span>
              <span style={{ opacity: 0.6 }}>·</span>
              <span>DISCONNECT</span>
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={primaryAction}
              disabled={!isReady || noWallet}
            >
              {isDetecting || isConnecting ? (
                <>
                  <span className="spinner" style={{ marginRight: 8 }} />
                  {actionLabel}
                </>
              ) : noWallet ? (
                'NO WALLET'
              ) : (
                actionLabel
              )}
            </button>
          )}
        </div>
      </nav>

      <main
        style={{
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 1,
          background: 'var(--color-border)',
          width: '100%',
        }}
        className="anonty-grid"
      >
        <section
          style={{
            background: 'var(--color-bg)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <section
            style={{
              padding: '40px 20px',
              borderBottom: '1px solid var(--color-border)',
            }}
            className="hero-pad"
          >
            <div style={{ marginBottom: 24, marginTop: 8 }}>
              <TrueFocus
                key={sentenceIndex}
                sentence={SENTENCES[sentenceIndex]}
                manualMode={false}
                blurAmount={5}
                borderColor="#00d97e"
                glowColor="rgba(0, 217, 126, 0.55)"
                animationDuration={0.55}
                pauseBetweenAnimations={0.35}
              />
            </div>
            <p
              style={{
                color: 'var(--color-on-surface-variant)',
                maxWidth: 540,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Prove a property of private input without exposing the input itself.
              ANONITY wraps a Midnight counter contract into a privacy-first
              verification surface — ownership of a secret is proven via a
              zero-knowledge witness, never disclosed on-chain.
            </p>
          </section>

          <section
            style={{
              padding: '40px 20px',
              flexGrow: 1,
              background: 'var(--color-surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              isolation: 'isolate',
            }}
            className="hero-pad"
          >
            <DotField
              dotRadius={1.4}
              dotSpacing={11}
              cursorRadius={380}
              bulgeStrength={48}
              glowRadius={130}
              gradientFrom="rgba(124, 58, 237, 0.55)"
              gradientTo="rgba(96, 165, 250, 0.30)"
            />
            <div
              style={{
                width: '100%',
                maxWidth: '60rem',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <p
                  className="code"
                  style={{
                    margin: 0,
                    color: 'var(--color-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: 13,
                  }}
                >
                  CLAIM: A KNOWLEDGE OF THE COUNTER'S OWNER SECRET SATISFIES THE VERIFICATION CONDITION.
                </p>
              </div>

              <div
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--color-surface)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <span className="caps" style={{ color: 'var(--color-primary)' }}>
                  PRIVACY VERIFICATION
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: result && !loading ? 'var(--color-primary)' : 'var(--color-secondary)',
                  }}
                >
                  {resultStatus}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr)',
                  gap: 1,
                  background: 'var(--color-border)',
                  position: 'relative',
                  zIndex: 1,
                }}
                className="priv-grid"
              >
                <div style={{ background: 'var(--color-bg)', padding: 24 }}>
                  <h3
                    className="caps"
                    style={{
                      color: 'var(--color-on-surface-variant)',
                      margin: '0 0 16px',
                      paddingBottom: 8,
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    PUBLIC DATA
                  </h3>
                  <Row label="NETWORK" value={`MIDNIGHT ${NETWORK.toUpperCase()}`} />
                  <Row
                    label="CONTRACT"
                    value={CONTRACT ? truncateHex(CONTRACT, 12, 6) : 'NOT CONFIGURED'}
                    mono
                  />
                  <Row
                    label="COUNTER"
                    value={count == null ? '—' : count.toString()}
                    mono
                  />
                  <Row
                    label="RESULT"
                    value={
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: resultColor }}>
                        {result && !loading ? '✓' : proofInProgress ? <span className="spinner" /> : '•'} {resultStatus}
                      </span>
                    }
                    mono
                  />
                  {result && !loading && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: '1px solid var(--color-border)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--color-on-surface-variant)',
                        wordBreak: 'break-all',
                      }}
                    >
                      TX {result}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: 'var(--color-bg)',
                    padding: 24,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      pointerEvents: 'none',
                      backgroundImage:
                        'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.015) 3px 4px)',
                      opacity: privateUnlocked ? 0.1 : 0.04,
                      transition: 'opacity 320ms var(--ease-out)',
                    }}
                  />
                  <h3
                    className="caps"
                    style={{
                      color: 'var(--color-on-surface-variant)',
                      margin: '0 0 16px',
                      paddingBottom: 8,
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    PRIVATE DATA
                    <span
                      style={{
                        fontSize: 12,
                        opacity: privateUnlocked ? 0.7 : 0.3,
                        transition: 'opacity 220ms var(--ease-out)',
                      }}
                    >
                      {privateUnlocked ? '◆' : '◇'}
                    </span>
                  </h3>
                  <Row
                    label="PRIVATE WITNESS"
                    value={
                      privateUnlocked ? (
                        <span
                          className="redacted-bar revealed mono"
                          style={{ fontSize: 13 }}
                        >
                          ████████████████
                        </span>
                      ) : (
                        <span className="redacted-bar mono" style={{ fontSize: 13 }}>
                          ████████████████
                        </span>
                      )
                    }
                  />
                  <Row label="SECRET KEY" value={privateUnlocked ? 'HELD IN LOCAL STATE' : 'NOT DISPLAYED'} />
                  <Row
                    label="DISCLOSURE"
                    value={privateUnlocked ? 'NONE — ZK PROOF ONLY' : 'NONE'}
                  />
                  {isConnected ? (
                    <div
                      className="fade-in"
                      style={{
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: '1px solid var(--color-border)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--color-on-surface-variant)',
                        lineHeight: 1.55,
                      }}
                    >
                      WITNESS UNLOCKED · PROOF SIGNATURE KEPT IN WALLET.
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: '1px solid var(--color-border)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--color-on-tertiary-fixed-variant)',
                        lineHeight: 1.55,
                      }}
                    >
                      WAITING FOR LACE CONNECTION TO UNLOCK WITNESS.
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: 20,
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  background: 'var(--color-bg)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {!isConnected ? (
                  <button
                    className="btn-prove"
                    onClick={primaryAction}
                    disabled={!isReady || noWallet}
                  >
                    {isDetecting || isConnecting ? (
                      <>
                        <span className="spinner" style={{ marginRight: 8 }} />
                        {actionLabel}
                      </>
                    ) : noWallet ? (
                      'INSTALL LACE TO PROVE'
                    ) : (
                      'CONNECT LACE'
                    )}
                  </button>
                ) : (
                  <>
                    <button className="btn-prove" onClick={increment} disabled={loading || !CONTRACT}>
                      {loading ? <><span className="spinner" style={{ marginRight: 8 }} />PROVING</> : 'PROVE PRIVATELY · +1'}
                    </button>
                    <button className="btn-ghost" onClick={decrement} disabled={loading || !CONTRACT}>
                      −1
                    </button>
                    <button className="btn-ghost" onClick={reset} disabled={loading || !CONTRACT}>
                      RESET
                    </button>
                    <button className="btn-ghost" onClick={refreshCount} disabled={loading}>
                      ↻ READ
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 32,
                width: '100%',
                maxWidth: '60rem',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                padding: '12px 16px',
                gap: 16,
                position: 'relative',
                zIndex: 1,
              }}
              className="flow-wrap"
            >
              <div
                className={`flex-item step-${step1}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 8,
                }}
              >
                <span
                  className="caps"
                  style={{
                    color: step1 === 'done' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  01 PRIVATE INPUT
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}
                >
                  {step1 === 'done' ? '(WITNESS)' : '████████'}
                </span>
              </div>
              <div
                className="flow-arrow"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}
              >
                <span
                  className="mono"
                  style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}
                >
                  ↓
                </span>
              </div>
              <div
                className={`flex-item step-${step2} ${step2 === 'active' ? 'step-pulse' : ''}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span
                  className="caps step-label"
                  style={{
                    color: step2 === 'done' || step2 === 'active' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  02 LOCAL PROOF
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: 'var(--color-on-surface-variant)' }}
                >
                  {step2 === 'active' ? '(GENERATING)' : step2 === 'done' ? '(BUILT)' : '(IDLE)'}
                </span>
              </div>
              <div
                className="flow-arrow"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24 }}
              >
                <span
                  className="mono"
                  style={{ color: 'var(--color-on-surface-variant)', fontSize: 12 }}
                >
                  ↓
                </span>
              </div>
              <div
                className={`flex-item step-${step3}`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <span
                  className="caps"
                  style={{
                    color: step3 === 'done' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  03 PUBLIC RESULT
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}
                >
                  {step3 === 'done' ? '✓' : '—'}
                </span>
              </div>
            </div>

            {error && (
              <div
                className="fade-in"
                style={{
                  marginTop: 24,
                  width: '100%',
                  maxWidth: '60rem',
                  padding: '12px 16px',
                  background: 'var(--color-error-container)',
                  color: 'var(--color-on-error-container)',
                  border: '1px solid var(--color-error-container)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  lineHeight: 1.55,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <span
                  className="caps-xs"
                  style={{ marginRight: 8, color: 'var(--color-on-error-container)' }}
                >
                  ERROR
                </span>
                {error}
              </div>
            )}

            {!CONTRACT && isConnected && (
              <div
                className="fade-in"
                style={{
                  marginTop: 24,
                  width: '100%',
                  maxWidth: '60rem',
                  padding: '12px 16px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-on-surface-variant)',
                  border: '1px dashed var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <span className="caps-xs" style={{ marginRight: 8 }}>
                  CONFIG
                </span>
                Set <code>VITE_DEFAULT_CONTRACT</code> to the counter deployment address before proving.
              </div>
            )}

            {noWallet && (
              <div
                className="fade-in"
                style={{
                  marginTop: 24,
                  width: '100%',
                  maxWidth: '60rem',
                  padding: '12px 16px',
                  background: 'var(--color-surface)',
                  color: 'var(--color-on-surface-variant)',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <span className="caps-xs" style={{ marginRight: 8 }}>
                  WALLET
                </span>
                No Midnight wallet detected. Install{' '}
                <a
                  className="link-style"
                  href="https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk"
                  target="_blank"
                  rel="noreferrer"
                >
                  Lace
                </a>{' '}
                and reload.
              </div>
            )}
          </section>
        </section>

        <aside
          style={{
            background: 'var(--color-bg)',
            borderLeft: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: 20,
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <h3 className="caps" style={{ color: 'var(--color-primary)', margin: 0 }}>
              PRIVACY STATUS
            </h3>
          </div>
          <div style={{ padding: 20, flexGrow: 1 }}>
            <h4
              className="caps-sm"
              style={{
                color: 'var(--color-on-surface-variant)',
                margin: '0 0 12px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              PRIVACY MODEL
            </h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <PrivacyRow label="PUBLIC" filled />
              <PrivacyRow label="PRIVATE" filled={isConnected} />
              <PrivacyRow label="PROOF" filled={step2 === 'done' || step2 === 'active'} />
              <PrivacyRow label="DISCLOSURE" filled={isConnected} value={isConnected ? 'NONE' : '–'} />
            </ul>

            <div
              style={{
                marginTop: 32,
                padding: 12,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-on-surface-variant)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                lineHeight: 1.55,
              }}
            >
              {isDetecting
                ? 'DETECTING LACE INJECTOR…'
                : noWallet
                  ? 'NO LACE WALLET FOUND.'
                  : isConnected
                    ? loading
                      ? 'GENERATING ZK PROOF · LOCAL PROVER.'
                      : result
                        ? 'PROOF ACCEPTED · WAITING FOR NEXT CALL.'
                        : 'WALLET READY · AWAITING CIRCUIT CALL.'
                    : 'SYSTEM READY / WAITING FOR LACE CONNECTION'}
            </div>

            {isConnected && address && (
              <div style={{ marginTop: 16 }}>
                <div
                  className="caps-xs"
                  style={{ color: 'var(--color-on-surface-variant)', marginBottom: 4 }}
                >
                  UNSHIELDED ADDRESS
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--color-secondary)',
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                  }}
                >
                  {address}
                </div>
              </div>
            )}

            <div style={{ marginTop: 32 }}>
              <h4
                className="caps-sm"
                style={{
                  color: 'var(--color-on-surface-variant)',
                  margin: '0 0 12px',
                  textTransform: 'uppercase',
                }}
              >
                STACK
              </h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                <StackRow label="CHAIN">MIDNIGHT {NETWORK.toUpperCase()}</StackRow>
                <StackRow label="LANG">COMPACT</StackRow>
                <StackRow label="WALLET">LACE</StackRow>
                <StackRow label="PROOF">LOCAL ZK</StackRow>
              </ul>
            </div>
          </div>
        </aside>
      </main>

      <footer
        style={{
          background: 'var(--color-surface-container-lowest)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '24px 32px',
          gap: 8,
          zIndex: 50,
        }}
        className="footer-row"
      >
        <div className="caps" style={{ color: 'var(--color-secondary)' }}>
          MIDNIGHT | COMPACT | LACE | PRIVATE PROOF
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="caps" style={{ color: 'var(--color-on-tertiary-fixed-variant)' }}>
            ANONITY / L2
          </span>
        </div>
      </footer>

      <style>{`
        @media (min-width: 900px) {
          .anonty-grid {
            grid-template-columns: 1fr 320px !important;
          }
          .priv-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .hero-pad {
            padding-left: 32px !important;
            padding-right: 32px !important;
          }
          .footer-row {
            flex-direction: row !important;
          }
        }
        @media (max-width: 600px) {
          .flow-wrap {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .flow-arrow {
            transform: rotate(90deg);
            width: 100% !important;
          }
          .flex-item {
            flex: 0 0 auto !important;
            width: 100% !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}> = ({ label, value, mono }) => (
  <div style={{ marginBottom: 16 }}>
    <label className="caps-sm" style={{ color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 4 }}>
      {label}
    </label>
    <div
      className={mono ? 'mono code' : 'mono'}
      style={{ color: 'var(--color-primary)', fontSize: 13 }}
    >
      {value}
    </div>
  </div>
);

const PrivacyRow: React.FC<{ label: string; filled: boolean; value?: string }> = ({
  label,
  filled,
  value,
}) => (
  <li
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid #222',
    }}
  >
    <span className="caps" style={{ fontSize: 12, color: 'var(--color-secondary)' }}>
      {label}
    </span>
    {value ? (
      <span className="mono" style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>
        {value}
      </span>
    ) : (
      <span
        className="mono"
        style={{
          fontSize: 14,
          lineHeight: 1,
          color: filled ? '#00d97e' : 'var(--color-on-tertiary-fixed-variant)',
          opacity: filled ? 1 : 0.55,
          transition: 'color 200ms var(--ease-out), opacity 200ms var(--ease-out)',
        }}
      >
        {filled ? '✓' : '–'}
      </span>
    )}
  </li>
);

const StackRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <li
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.04em',
    }}
  >
    <span style={{ color: 'var(--color-on-surface-variant)' }}>{label}</span>
    <span style={{ color: 'var(--color-primary)' }}>{children}</span>
  </li>
);

export default App;
