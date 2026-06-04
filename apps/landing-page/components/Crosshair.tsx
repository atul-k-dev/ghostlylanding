import React from 'react';

export function Crosshair({ x, y, className = "" }: { x: string, y: string, className?: string }) {
  return (
    <div 
      className={`absolute w-[9px] h-[9px] flex items-center justify-center pointer-events-none z-20 ${className}`} 
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <div className="absolute w-full h-[1px] bg-accent" />
      <div className="absolute h-full w-[1px] bg-accent" />
    </div>
  );
}
