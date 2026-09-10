import { useEffect, useState } from "react";
import { secondsUntil, formatCountdown } from "../lib/format";

export default function CountdownTimer({ deadline, onExpire }) {
  const [remaining, setRemaining] = useState(() => secondsUntil(deadline));

  useEffect(() => {
    setRemaining(secondsUntil(deadline));
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = secondsUntil(deadline);
        if (next === 0 && prev !== 0) onExpire?.();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span className="tabular-nums font-semibold">{formatCountdown(remaining)}</span>;
}
