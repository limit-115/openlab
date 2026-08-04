import { useEffect, useState } from "react";

function calculateElapsed(recordedMilliseconds: number, recordedAt: string, running: boolean) {
    if (!running) {
        return recordedMilliseconds;
    }

    return recordedMilliseconds + Math.max(0, Date.now() - new Date(recordedAt).getTime());
}

export function useElapsedTime(
    recordedMilliseconds: number,
    recordedAt: string,
    running: boolean
): number {
    const [elapsed, setElapsed] = useState(() =>
        calculateElapsed(recordedMilliseconds, recordedAt, running)
    );

    useEffect(() => {
        setElapsed(calculateElapsed(recordedMilliseconds, recordedAt, running));

        if (!running) {
            return;
        }

        const interval = window.setInterval(
            () => setElapsed(calculateElapsed(recordedMilliseconds, recordedAt, running)),
            1000
        );
        return () => window.clearInterval(interval);
    }, [recordedAt, recordedMilliseconds, running]);

    return elapsed;
}
