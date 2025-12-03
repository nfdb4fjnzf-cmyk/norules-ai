import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebaseClient';
import { createUser } from '../../services/firestore/users';
import SEO from '../../components/SEO';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [isResetMode, setIsResetMode] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (isResetMode) {
            if (!email) {
                setError('Please enter your email address.');
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                setMessage('Password reset email sent! Check your inbox.');
                setIsResetMode(false);
            } catch (err: any) {
                setError(err.message);
            }
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            // Ensure user document exists (idempotent)
            await createUser({
                uid: result.user.uid,
                email: result.user.email || '',
                displayName: result.user.displayName || '',
                photoURL: result.user.photoURL || ''
            });
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-white">
            <SEO title="Login" description="Login to your NoRules AI account." />
            <div className="bg-background-card p-8 rounded-card border border-border w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {isResetMode ? 'Reset Password' : 'Login to Norules AI'}
                </h2>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
                {message && <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded mb-4 text-sm">{message}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-border rounded-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>

                    {!isResetMode && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-secondary">Password</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetMode(true);
                                        setError('');
                                        setMessage('');
                                    }}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-background border border-border rounded-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                    )}

                    <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-button transition-colors">
                        {isResetMode ? 'Send Reset Link' : 'Login'}
                    </button>

                    {isResetMode && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsResetMode(false);
                                setError('');
                                setMessage('');
                            }}
                            className="w-full text-sm text-secondary hover:text-white mt-2"
                        >
                            Back to Login
                        </button>
                    )}
                </form>

                <div className="mt-4 flex items-center justify-between">
                    <hr className="w-full border-border" />
                    <span className="px-2 text-secondary text-sm">OR</span>
                    <hr className="w-full border-border" />
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="mt-4 w-full bg-white text-black font-bold py-2 px-4 rounded-button flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                    Login with Google
                </button>

                <p className="mt-6 text-center text-sm text-secondary">
                    Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign Up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
