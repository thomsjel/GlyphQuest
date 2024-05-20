import { useEffect, useState } from 'react';

const useIsApple = () => {
    const [isIphone, setIsIphone] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        if (/iPhone|iPod/.test(userAgent) && !window.MSStream) {
            setIsIphone(true);
        }
    }, []);

    return isIphone;
};

export default useIsApple;
