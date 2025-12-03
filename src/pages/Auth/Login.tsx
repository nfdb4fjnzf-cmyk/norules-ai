import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebaseClient';
import { createUser } from '../../services/firestore/users';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const [isResetMode, setIsResetMode] = useState(false);
    const [message, setMessage] = useState('');

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'zh' : 'en';
        i18n.changeLanguage(newLang);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (isResetMode) {
            if (!email) {
                setError(t('auth.emailRequired'));
                return;
            }
            try {
                await sendPasswordResetEmail(auth, email);
                setMessage(t('auth.resetSent'));
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
        <div className="min-h-screen flex items-center justify-center bg-background text-white relative">
            <SEO title={t('auth.loginTitle')} description="Login to your NoRules AI account." />

            {/* Language Switcher */}
            <div className="absolute top-6 right-6">
                <button
                    onClick={toggleLanguage}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 bg-[#151927] border border-white/5"
                    title="Switch Language"
                >
                    <Globe size={20} />
                </button>
            </div>

            <div className="bg-background-card p-8 rounded-card border border-border w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {isResetMode ? t('auth.resetTitle') : t('auth.loginTitle')}
                </h2>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
                {message && <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded mb-4 text-sm">{message}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-1">{t('auth.emailLabel')}</label>
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
                                <label className="block text-sm font-medium text-secondary">{t('auth.passwordLabel')}</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResetMode(true);
                                        setError('');
                                        setMessage('');
                                    }}
                                    className="text-xs text-primary hover:underline"
                                >
                                    {t('auth.forgotPassword')}
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
                        {isResetMode ? t('auth.sendResetBtn') : t('auth.loginBtn')}
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
                            {t('auth.backToLogin')}
                        </button>
                    )}
                </form>

                <div className="mt-4 flex items-center justify-between">
                    <hr className="w-full border-border" />
                    <span className="px-2 text-secondary text-sm">{t('auth.or')}</span>
                    <hr className="w-full border-border" />
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="mt-4 w-full bg-white text-black font-bold py-2 px-4 rounded-button flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                    {t('auth.googleLogin')}
                </button>

                <p className="mt-6 text-center text-sm text-secondary">
                    {t('auth.noAccount')} <Link to="/signup" className="text-primary hover:underline">{t('auth.signUp')}</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
