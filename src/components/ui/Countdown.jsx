import React, { useState, useEffect } from 'react';

export const Countdown = ({ targetDate, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeLeft('Started');
        return;
      }

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setTimeLeft(`starts in ${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`starts in ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`starts in ${minutes} min`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className={`tabular-nums font-medium ${className}`}>
      {timeLeft}
    </span>
  );
};

export default Countdown;
