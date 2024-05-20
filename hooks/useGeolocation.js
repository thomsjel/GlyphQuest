// useGeolocation.js
import { useState, useEffect } from 'react';

const useGeolocation = () => {
    const [location, setLocation] = useState({ latitude: null, longitude: null, error: null });

    const handleSuccess = (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude, error: null });
    };

    const handleError = (error) => {
        setLocation((prevState) => ({ ...prevState, error }));
    };

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation((prevState) => ({ ...prevState, error: 'Geolocation is not supported by your browser.' }));
            return;
        }

        const watcher = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 27000,
        });

        return () => navigator.geolocation.clearWatch(watcher);
    }, []);

    return location;
};

export default useGeolocation;
