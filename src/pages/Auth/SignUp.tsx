import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../../config/firebaseClient';
import { createUser } from '../../services/firestore/users';
import SEO from '../../components/SEO';

const SignUp: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('Starting sign up...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Auth successful, user:', userCredential.user.uid);

            console.log('Creating Firestore document...');
            await createUser({
                uid: userCredential.user.uid,
                email: userCredential.user.email || '',
                displayName: email.split('@')[0],
                photoURL: ''
            });
            console.log('Firestore document created.');

            navigate('/');
        } catch (err: any) {
            console.error('Sign Up Error:', err);
            setError(err.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
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
            <SEO title="Sign Up" description="Create your NoRules AI account today." />
            <div className="bg-background-card p-8 rounded-card border border-border w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 text-center">Sign Up for Norules AI</h2>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSignUp} className="space-y-4">
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
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background border border-border rounded-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-button transition-colors">
                        Sign Up
                    </button>
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
                    Sign Up with Google
                </button>

                <p className="mt-6 text-center text-sm text-secondary">
                    Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default SignUp;
