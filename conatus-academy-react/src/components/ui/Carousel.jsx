import { useState, useEffect, useCallback } from 'react';
import { CourseCard } from './CourseCard';

export function Carousel({ items, variant = 'carousel' }) {
  const [idx, setIdx] = useState(() => items.length);

  const move = useCallback((dir) => {
    setIdx((prev) => {
      let next = prev + dir;
      if (next < 0) next = items.length * 3 - 1;
      if (next >= items.length * 3) next = 0;
      return next;
    });
  }, [items.length]);

  const goTo = (i) => setIdx(items.length + i);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(() => move(1), 5000);
    return () => clearInterval(timer);
  }, [items.length, move]);

  if (items.length === 0) return null;

  const displayItems = [...items, ...items, ...items];

  return (
    <>
      <div className={`${variant}-container`}>
        <button className={`${variant}-btn ${variant}-prev`} onClick={() => move(-1)}>&#10094;</button>
        <div className={`${variant}-wrapper`}>
          <div
            className={`${variant}-track`}
            style={{ transform: `translateX(calc(${idx} * (-100% / 3 - 8px)))` }}
          >
            {displayItems.map((item, index) => (
              <div key={`${item.id}-${index}`} className={`${variant}-slide`}>
                <CourseCard curso={item} variant={variant} />
              </div>
            ))}
          </div>
        </div>
        <button className={`${variant}-btn ${variant}-next`} onClick={() => move(1)}>&#10095;</button>
      </div>
      <div className={`${variant}-dots`}>
        {items.map((_, i) => (
          <span
            key={i}
            className={`${variant}-dot ${idx % items.length === i ? 'active' : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </>
  );
}
