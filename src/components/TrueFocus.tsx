import { useEffect, useRef, useState, CSSProperties } from 'react';
import { motion } from 'motion/react';
import './TrueFocus.css';

interface TrueFocusProps {
  sentence?: string;
  separator?: string;
  blurAmount?: number;
  borderColor?: string;
  glowColor?: string;
  animationDuration?: number;
  pauseBetweenAnimations?: number;
  emphasisIndex?: number;
  emphasisPause?: number;
}

const TrueFocus = ({
  sentence = 'PROVE WITHOUT REVEALING',
  separator = ' ',
  blurAmount = 5,
  borderColor = '#00d97e',
  glowColor = 'rgba(0, 217, 126, 0.55)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 0.35,
  emphasisIndex = 2,
  emphasisPause = 1.8,
}: TrueFocusProps) => {
  const words = sentence.split(separator);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [focusRect, setFocusRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const baseInterval = (animationDuration + pauseBetweenAnimations) * 1000;
    const interval = setInterval(
      () => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
      },
      baseInterval,
    );
    return () => clearInterval(interval);
  }, [animationDuration, pauseBetweenAnimations, words.length]);

  useEffect(() => {
    if (currentIndex === null || currentIndex === -1) return;
    if (!wordRefs.current[currentIndex] || !containerRef.current) return;

    const parentRect = containerRef.current.getBoundingClientRect();
    const activeRect = wordRefs.current[currentIndex].getBoundingClientRect();

    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height,
    });
  }, [currentIndex, words.length]);

  // Auto cycle: dwell on emphasisIndex (REVEALING) longer than other words.
  useEffect(() => {
    if (currentIndex !== emphasisIndex) return;
    const t = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, emphasisPause * 1000);
    return () => clearTimeout(t);
  }, [currentIndex, emphasisIndex, emphasisPause, words.length]);

  const frameStyle = {
    '--border-color': borderColor,
    '--glow-color': glowColor,
  } as CSSProperties;

  return (
    <div className="focus-container" ref={containerRef}>
      {words.map((word, index) => {
        const isActive = index === currentIndex;
        return (
          <span
            key={index}
            ref={(el) => {
              wordRefs.current[index] = el;
            }}
            className={`focus-word ${isActive ? 'active' : ''}`}
            style={{
              filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              ...frameStyle,
              transition: `filter ${animationDuration}s ease`,
            }}
          >
            {word}
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
          opacity: currentIndex >= 0 ? 1 : 0,
        }}
        transition={{ duration: animationDuration }}
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
