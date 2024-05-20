import { useState, useEffect } from "react";

function DisplayScreenshotCard() {
    const [screenshotSrc, setScreenshotSrc] = useState('');

    useEffect(() => {
        const savedScreenshot = localStorage.getItem('screenshot');
        if (savedScreenshot) {
            setScreenshotSrc(savedScreenshot);
        }
    }, [screenshotSrc]);

    return (
        screenshotSrc ? <img src={screenshotSrc} alt="Saved Screenshot" style={{ maxWidth: '100%' }} /> : <p>{screenshotSrc}</p>
    );
}


export default DisplayScreenshotCard;