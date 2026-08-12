import { useEffect } from 'react';

export function useScrollLock(lock: boolean) {
    useEffect(() => {
        if (lock) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [lock]);
}
