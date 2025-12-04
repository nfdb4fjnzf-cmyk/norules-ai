import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';

const Success: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const paymentId = searchParams.get('NP_id');

    useEffect(() => {
        if (paymentId) {
            showToast('success', 'Payment initiated successfully!');
        }
    }, [paymentId, showToast]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0E14] px-4">
            <div className="max-w-md w-full bg-[#151927] rounded-2xl p-8 border border-green-500/20 text-center shadow-2xl">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <span className="material-symbols-outlined text-4xl text-green-400">check_circle</span>
                </div>

                <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>

                <p className="text-gray-400 mb-8">
                    Thank you for your purchase. Your payment is being processed by the blockchain network.
                    <br /><br />
                    <span className="text-yellow-400 text-sm">
                        Note: It may take a few minutes for credits to appear in your account.
                    </span>
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors"
                    >
                        Go to Dashboard
                    </button>

                    <button
                        onClick={() => navigate('/subscription/topup')}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
                    >
                        Buy More Points
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Success;
