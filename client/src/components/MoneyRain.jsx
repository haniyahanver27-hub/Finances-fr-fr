import React, { useEffect, useState } from 'react';

const MoneyRain = () => {
  const [moneyItems, setMoneyItems] = useState([]);

  useEffect(() => {
    // Create initial money items
    const items = Array.from({ length: 9 }, (_, i) => i);
    setMoneyItems(items);

    // Add new money items periodically for continuous effect
    const interval = setInterval(() => {
      setMoneyItems(prev => [
        ...prev,
        prev.length > 0 ? Math.max(...prev) + 1 : 0
      ]);
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="money-rain-container">
      {moneyItems.map((item) => (
        <div
          key={item}
          className={`falling-money delay-${(item % 9) + 1}`}
        >
          💰
        </div>
      ))}
    </div>
  );
};

export default MoneyRain;
