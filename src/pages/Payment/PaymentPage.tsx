import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

const PaymentPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const orderId = searchParams.get('orderId');

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [remainingTime, setRemainingTime] = useState(0);
    const [copied, setCopied] = useState(false);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch order status
    const fetchOrderStatus = async () => {
        if (!orderId) return;

        try {
            const response = await api.get(`/payment/order-status?orderId=${orderId}`);
            if (response.data.code === 0) {
                const data = response.data.data;
                setOrder(data);
                setRemainingTime(data.remainingSeconds);

                // If completed, redirect to success
                if (data.status === 'completed') {
                    showToast('success', '付款成功！');
                    setTimeout(() => navigate('/subscription/success'), 1500);
                }

                // If expired, show message
                if (data.status === 'expired' || data.isExpired) {
                    showToast('error', '訂單已過期');
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch order:', error);
            showToast('error', '無法獲取訂單資訊');
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        if (!orderId) {
            navigate('/subscription');
            return;
        }

        fetchOrderStatus();

        // Poll every 5 seconds
        pollRef.current = setInterval(fetchOrderStatus, 5000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [orderId]);

    // Countdown timer
    useEffect(() => {
        if (remainingTime <= 0) return;

        const timer = setInterval(() => {
            setRemainingTime(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [order]);

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('success', '已複製到剪貼簿');
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0D14]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0D14]">
                <div className="text-center">
                    <p className="text-white text-xl">找不到訂單</p>
                    <button
                        onClick={() => navigate('/subscription')}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        返回
                    </button>
                </div>
            </div>
        );
    }

    const isExpired = order.status === 'expired' || remainingTime <= 0;
    const isConfirming = order.status === 'confirming';
    const isCompleted = order.status === 'completed';

    return (
        <div className="min-h-screen bg-[#0B0D14] py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">USDT 付款</h1>
                    <p className="text-gray-400">請使用 imToken 或 TronLink 掃描付款</p>
                </div>

                {/* Payment Card */}
                <div className="bg-[#151927] rounded-2xl p-8 border border-white/10">
                    {/* Status Badge */}
                    <div className="flex justify-center mb-6">
                        {isCompleted && (
                            <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full flex items-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                付款成功
                            </span>
                        )}
                        {isConfirming && (
                            <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-2">
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                交易確認中...
                            </span>
                        )}
                        {isExpired && (
                            <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full flex items-center gap-2">
                                <span className="material-symbols-outlined">error</span>
                                訂單已過期
                            </span>
                        )}
                        {!isCompleted && !isConfirming && !isExpired && (
                            <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full flex items-center gap-2">
                                <span className="material-symbols-outlined">schedule</span>
                                等待付款
                            </span>
                        )}
                    </div>

                    {/* QR Code */}
                    {!isExpired && !isCompleted && (
                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-4 rounded-xl">
                                <QRCodeSVG
                                    value={order.walletAddress}
                                    size={180}
                                    level="H"
                                />
                            </div>
                        </div>
                    )}

                    {/* Amount */}
                    <div className="text-center mb-6">
                        <p className="text-gray-400 text-sm mb-1">請支付精確金額</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-4xl font-bold text-white">{order.amount}</span>
                            <span className="text-xl text-gray-400">USDT</span>
                        </div>
                        <p className="text-xs text-yellow-400 mt-2">
                            ⚠️ 金額必須完全一致，否則無法自動入帳
                        </p>
                    </div>

                    {/* Wallet Address */}
                    <div className="bg-black/30 rounded-xl p-4 mb-6">
                        <p className="text-gray-400 text-xs mb-2">收款地址 (TRC20)</p>
                        <div className="flex items-center gap-2">
                            <code className="text-white text-sm flex-1 break-all">
                                {order.walletAddress}
                            </code>
                            <button
                                onClick={() => copyToClipboard(order.amount.toString())}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title="複製金額"
                            >
                                <span className="material-symbols-outlined text-gray-400">
                                    content_copy
                                </span>
                            </button>
                        </div>
                        <button
                            onClick={() => copyToClipboard(order.walletAddress)}
                            className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <span className="material-symbols-outlined">content_copy</span>
                            複製地址
                        </button>
                    </div>

                    {/* Timer */}
                    {!isExpired && !isCompleted && (
                        <div className="text-center">
                            <p className="text-gray-400 text-sm mb-1">剩餘時間</p>
                            <p className={`text-2xl font-mono ${remainingTime < 300 ? 'text-red-400' : 'text-white'}`}>
                                {formatTime(remainingTime)}
                            </p>
                        </div>
                    )}

                    {/* Transaction Hash */}
                    {order.txHash && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-gray-400 text-xs mb-2">交易 Hash</p>
                            <a
                                href={`https://tronscan.org/#/transaction/${order.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 text-sm break-all hover:underline"
                            >
                                {order.txHash}
                            </a>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-[#151927] rounded-xl p-6 border border-white/10">
                    <h3 className="text-white font-semibold mb-4">付款說明</h3>
                    <ol className="text-gray-400 text-sm space-y-3">
                        <li className="flex gap-3">
                            <span className="text-blue-400 font-bold">1.</span>
                            使用 imToken、TronLink 或其他支援 TRC20 的錢包
                        </li>
                        <li className="flex gap-3">
                            <span className="text-blue-400 font-bold">2.</span>
                            掃描 QR Code 或複製收款地址
                        </li>
                        <li className="flex gap-3">
                            <span className="text-blue-400 font-bold">3.</span>
                            <span>
                                輸入精確金額 <strong className="text-white">{order.amount} USDT</strong>
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span className="text-blue-400 font-bold">4.</span>
                            確認轉帳，等待系統自動確認（約 1-3 分鐘）
                        </li>
                    </ol>
                </div>

                {/* Back Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/subscription')}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        ← 返回訂閱頁面
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
