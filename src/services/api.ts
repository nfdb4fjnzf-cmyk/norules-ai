import axios from 'axios';
import { auth } from '../config/firebaseClient';

const api = axios.create({
    baseURL: '/api', // Vercel rewrites will handle this
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    // Add Timestamp for Replay Protection
    config.headers['X-Timestamp'] = Date.now().toString();

    // Add Auth Token if user is logged in
    const user = auth.currentUser;
    if (user) {
        try {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
            console.error('Error getting auth token', error);
        }
    } else {
        // For development/testing without login, we might skip or send a dummy if backend allows
        // But backend strictly checks signature.
        // If no user, request will likely fail 401.
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
