import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

const Landing: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            navigate('/dashboard');
        }
    }, [user, loading, navigate]);

    if (loading) return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#0B0E14] text-white font-sans selection:bg-blue-500/30">
            <SEO
                title="Ad Compliance & Generation Platform"
                description="Analyze ads for policy violations on Meta, Google, and TikTok. Generate high-converting, safe ad copy in seconds with AI."
            />
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-[#0B0E14]/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <img src="/norules-logo.png" alt="Norules AI" className="w-full h-full object-cover rounded-xl opacity-90" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Norules AI</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-5 py-2.5 text-sm font-bold bg-white text-black rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg shadow-white/10"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 animate-fade-in">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        NEW: Gemini 1.5 Pro Integration
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                        Ad Compliance & <br /> Generation with AI
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Analyze your ads for policy violations on Meta, Google, and TikTok. Generate high-converting, safe ad copy in seconds.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/signup')}
                            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40"
                        >
                            Start Analyzing Free
                        </button>
                        <button
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-lg border border-white/10 transition-all"
                        >
                            Learn More
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-20 px-6 bg-[#0F1218]">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-16">Why Choose Norules AI?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: 'policy',
                                title: 'Risk Analysis',
                                desc: 'Instant policy checks for Facebook, Instagram, TikTok, and Google Ads. Avoid bans before they happen.'
                            },
                            {
                                icon: 'auto_awesome',
                                title: 'AI Generation',
                                desc: 'Create compliant, high-CTR ad copy and visuals using advanced LLMs like Gemini 1.5 and GPT-4.'
                            },
                            {
                                icon: 'verified_user',
                                title: 'Safe & Secure',
                                desc: 'Enterprise-grade security. Your data and ad strategies are protected with strict privacy protocols.'
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="p-8 rounded-3xl bg-[#151927] border border-white/5 hover:border-blue-500/30 transition-all group">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-blue-400 text-2xl">{feature.icon}</span>
                                </div>
                                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section (GEO Optimized) */}
            <section className="py-20 px-6">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-4">Frequently Asked Questions</h2>
                    <p className="text-gray-400 text-center mb-12">Everything you need to know about Norules AI.</p>

                    <div className="space-y-4">
                        {[
                            {
                                q: "What is Norules AI?",
                                a: "Norules AI is an advanced ad compliance and generation platform. It helps marketers analyze their ad creatives (text, image, video) for policy violations on major platforms like Meta and TikTok, and generates safe, high-performing ad copy."
                            },
                            {
                                q: "How does the ad compliance checker work?",
                                a: "We use state-of-the-art AI models (Gemini 1.5 Pro, GPT-4) to scan your content against a database of known ad policies. It identifies risky keywords, prohibited imagery, and compliance flags, giving you a risk score and actionable fix suggestions."
                            },
                            {
                                q: "Is there a free plan?",
                                a: "Yes! Our Lite plan starts at just $5/month, but we offer a free trial period for new users to test the analysis features. You can upgrade to Standard or Enterprise for higher daily limits."
                            },
                            {
                                q: "Can I generate images and videos?",
                                a: "Absolutely. Norules AI integrates with tools like Imagen 3, DALL-E 3, and Sora (coming soon) to generate high-quality, compliant visual assets for your campaigns."
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-[#151927] border border-white/5">
                                <h3 className="text-lg font-bold mb-3 text-gray-200">{item.q}</h3>
                                <p className="text-gray-400 leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/5 text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Norules AI. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Landing;
