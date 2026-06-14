import React, { useState } from 'react';
import alphaPng from '../assets/hero.png';

const FloatingMascot = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="floating-mascot"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Click to chat with Alpha Meow!"
    >
      <img
        src={alphaPng}
        alt="Alpha Meow"
        className={`mascot-image ${isHovered ? 'hovered' : ''}`}
      />
      {isHovered && <div className="mascot-tooltip">Chat with Alpha!</div>}
    </div>
  );
};

export default FloatingMascot;
