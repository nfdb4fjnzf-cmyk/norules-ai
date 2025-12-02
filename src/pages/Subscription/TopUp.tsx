import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

const TopUp: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [customPoints, setCustomPoints] = useState<number>(10001);

    const handleTopUp = async (points: number) => {
        if (!user) {
            showToast('error', 'Please log in first');
            return;
        }

        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/payment/create-topup-invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ points })
            });

            const data = await res.json();

            if (data.code === 0 && data.data.invoice_url) {
                window.open(data.data.invoice_url, '_blank');
                showToast('success', 'Redirecting to payment...');
            } else {
                throw new Error(data.message || 'Failed to create invoice');
            }
        } catch (error: any) {
            console.error('TopUp Error:', error);
            showToast('error', error.message || 'Payment initialization failed');
        } finally {
            setLoading(false);
        }
    };

    const calculateCustomPrice = (points: number) => {
        return (points * 0.003).toFixed(2);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-gray-100 mb-4">Purchase Points</h1>
                <p className="text-gray-400">Need more credits? Top up instantly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Tier 1 */}
                <div className="bg-[#151927] rounded-2xl p-8 border border-white/10 hover:border-blue-500 transition-all flex flex-col items-center">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-3xl text-blue-400">bolt</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Starter Pack</h3>
                    <div className="text-4xl font-bold text-white mb-4">2,000 <span className="text-lg text-gray-400 font-normal">Points</span></div>
                    <div className="text-2xl text-blue-400 font-bold mb-8">$15 USD</div>
                    <button
                        onClick={() => handleTopUp(2000)}
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Buy Now'}
                    </button>
                </div>

                {/* Tier 2 */}
                <div className="bg-[#151927] rounded-2xl p-8 border border-blue-500/50 shadow-lg shadow-blue-500/10 transition-all flex flex-col items-center transform scale-105">
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                        POPULAR
                    </div>
                    <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-3xl text-purple-400">diamond</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Pro Pack</h3>
                    <div className="text-4xl font-bold text-white mb-4">10,000 <span className="text-lg text-gray-400 font-normal">Points</span></div>
                    <div className="text-2xl text-purple-400 font-bold mb-8">$30 USD</div>
                    <button
                        onClick={() => handleTopUp(10000)}
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg"
                    >
                        {loading ? 'Processing...' : 'Buy Now'}
                    </button>
                </div>

                {/* Tier 3 - Custom */}
                <div className="bg-[#151927] rounded-2xl p-8 border border-white/10 hover:border-blue-500 transition-all flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-3xl text-green-400">factory</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Enterprise Custom</h3>
                    <div className="w-full mb-4">
                        <label className="block text-xs text-gray-400 mb-2 text-left">Enter Amount (≥ 10,000)</label>
                        <input
                            type="number"
                            min="10000"
                            value={customPoints}
                            onChange={(e) => setCustomPoints(parseInt(e.target.value) || 0)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white text-center font-bold text-xl outline-none focus:border-green-500"
                        />
                    </div>
                    <div className="text-2xl text-green-400 font-bold mb-8">
                        ${calculateCustomPrice(customPoints)} USD
                        <span className="block text-xs text-gray-500 font-normal mt-1">($0.003 / point)</span>
                    </div>
                    <button
                        onClick={() => handleTopUp(customPoints)}
                        disabled={loading || customPoints < 10000}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Buy Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopUp;
