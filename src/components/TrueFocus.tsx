import { useEffect, useRef, useState, CSSProperties } from 'react';
import { motion } from 'motion/react';
import './TrueFocus.css';

interface TrueFocusProps {
  /** Groups separated by `groupSeparator` (default '|'). Each group is one focus target.
   *  Words within a group share the same blur/active state and the frame wraps them as a unit. */
  sentence?: string;
  groupSeparator?: string;
  wordSeparator?: string;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  /** Seconds to stay on each group; array aligned with groups, or single number applied to all.
   *  The group at `emphasisIndex` (default last) overrides with `emphasisPause`. */
  pauseBetweenGroups?: number;
  emphasisIndex?: number;
  emphasisPause?: number;
}

const TrueFocus = ({
  sentence = 'PROVE WITHOUT | REVEALING',
  groupSeparator = '|',
  wordSeparator = ' ',
  blurAmount = 5,
  borderColor = '#00d97e',
  glowColor = 'rgba(0, 217, 126, 0.55)',
  animationDuration = 0.55,
  pauseBetweenGroups = 3.0,
  emphasisIndex,
  emphasisPause = 0.9,
}: TrueFocusProps) => {
  const groups = sentence.split(groupSeparator).map((g) => g.trim()).filter(Boolean);
  const totalGroups = groups.length;
  const emphasisIdx = emphasisIndex ?? totalGroups - 1;

  const [currentGroup, setCurrentGroup] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const interval = (pauseBetweenGroups + animationDuration) * 1000;
    const id = setInterval(() => {
      setCurrentGroup((prev) => (prev + 1) % totalGroups);
    }, interval);
    return () => clearInterval(id);
  }, [pauseBetweenGroups, animationDuration, totalGroups]);

  // Shorten or lengthen the dwell when landing on the emphasis group.
  useEffect(() => {
    if (currentGroup !== emphasisIdx) return;
    const id = setTimeout(() => {
      setCurrentGroup((prev) => (prev + 1) % totalGroups);
    }, emphasisPause * 1000);
    return () => clearTimeout(id);
  }, [currentGroup, emphasisIdx, emphasisPause, totalGroups]);

  useEffect(() => {
    if (!groupRefs.current[currentGroup] || !containerRef.current) return;
    const parentRect = containerRef.current.getBoundingClientRect();
    const activeRect = groupRefs.current[currentGroup].getBoundingClientRect();
    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height,
    });
  }, [currentGroup, totalGroups]);

  const frameStyle = {
    '--border-color': borderColor,
    '--glow-color': glowColor,
  } as CSSProperties;

  return (
    <div className="focus-container" ref={containerRef}>
      {groups.map((group, gi) => {
        const isActive = gi === currentGroup;
        const words = group.split(wordSeparator);
        return (
          <span
            key={gi}
            ref={(el) => {
              groupRefs.current[gi] = el;
            }}
            className={`focus-group ${isActive ? 'active' : ''}`}
            style={{
              filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              ...frameStyle,
              transition: `filter ${animationDuration}s ease`,
            }}
          >
            {words.map((w, wi) => (
              <span key={wi} className="focus-word">
                {w}
              </span>
            ))}
          </span>
        );
      })}

      <motion.div
        className="focus-frame"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: currentGroup >= 0 ? 1 : 0,
        }}
        transition={{ duration: animationDuration, ease: [0.23, 1, 0.32, 1] }}
        style={frameStyle}
      >
        <span className="corner top-left"></span>
        <span className="corner top-right"></span>
        <span className="corner bottom-left"></span>
        <span className="corner bottom-right"></span>
      </motion.div>
    </div>
  );
};

export default TrueFocus;
