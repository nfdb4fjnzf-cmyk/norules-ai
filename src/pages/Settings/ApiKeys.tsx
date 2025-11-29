import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

interface ApiKey {
    id: string;
    name: string;
    key: string;
    createdAt: string;
    lastUsed: string;
}

const ApiKeys: React.FC = () => {
    const { t } = useTranslation();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [newKeyName, setNewKeyName] = useState('');
    const [creating, setCreating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { showToast } = useToast();

    const { user } = useAuth();

    useEffect(() => {
        if (user) fetchKeys();
    }, [user]);

    const fetchKeys = async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/apikeys/manage', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setKeys(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch keys', error);
            showToast('error', t('apiKeys.messages.failedFetch'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newKeyName.trim() || !user) return;
        setCreating(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/apikeys/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newKeyName })
            });
            const data = await res.json();
            if (data.success) {
                setKeys([...keys, data.data]);
                setNewKeyName('');
                setIsModalOpen(false);
                showToast('success', t('apiKeys.messages.created'));
            } else {
                showToast('error', data.error || t('apiKeys.messages.failedCreate'));
            }
        } catch (error) {
            console.error('Failed to create key', error);
            showToast('error', t('apiKeys.messages.failedCreate'));
        } finally {
            setCreating(false);
        }
    };

    const openDeleteModal = (id: string) => {
        setDeleteKeyId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteKeyId || !user) return;
        setDeleting(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/apikeys/manage?id=${deleteKeyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setKeys(keys.filter(k => k.id !== deleteKeyId));
                showToast('success', t('apiKeys.messages.deleted'));
                setIsDeleteModalOpen(false);
            } else {
                showToast('error', data.error || t('apiKeys.messages.failedDelete'));
            }
        } catch (error) {
            console.error('Failed to delete key', error);
            showToast('error', t('apiKeys.messages.failedDelete'));
        } finally {
            setDeleting(false);
            setDeleteKeyId(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-100">{t('apiKeys.title')}</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-xl px-4 py-2 font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-all duration-150 ease-out hover:opacity-80 active:scale-95 flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('apiKeys.create')}
                </button>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-6 overflow-hidden backdrop-blur-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className="p-4 text-sm font-medium text-gray-400">{t('apiKeys.table.name')}</th>
                            <th className="p-4 text-sm font-medium text-gray-400">{t('apiKeys.table.key')}</th>
                            <th className="p-4 text-sm font-medium text-gray-400">{t('apiKeys.table.created')}</th>
                            <th className="p-4 text-sm font-medium text-gray-400">{t('apiKeys.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}>
                                    <td className="p-4"><SkeletonLoader type="small" /></td>
                                    <td className="p-4"><SkeletonLoader type="medium" /></td>
                                    <td className="p-4"><SkeletonLoader type="small" /></td>
                                    <td className="p-4"><SkeletonLoader type="small" className="w-16" /></td>
                                </tr>
                            ))
                        ) : keys.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-400">{t('apiKeys.noKeys')}</td></tr>
                        ) : (
                            keys.map(key => (
                                <tr key={key.id}>
                                    <td className="p-4 text-gray-200">{key.name}</td>
                                    <td className="p-4 font-mono text-sm text-gray-400">
                                        {key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">
                                        {new Date(key.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => openDeleteModal(key.id)}
                                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                                            title={t('common.delete')}
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={t('apiKeys.modals.createTitle')}
                primaryLabel={creating ? t('apiKeys.modals.creating') : t('common.create') || 'Create'}
                onPrimaryClick={handleCreate}
                secondaryLabel={t('common.cancel')}
                onSecondaryClick={() => setIsModalOpen(false)}
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">
                        {t('apiKeys.modals.createDesc')}
                    </p>
                    <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder={t('apiKeys.modals.placeholder')}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/40 outline-none transition-all duration-150"
                        autoFocus
                    />
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title={t('apiKeys.modals.deleteTitle')}
                primaryLabel={deleting ? t('apiKeys.modals.deleting') : t('common.delete')}
                onPrimaryClick={confirmDelete}
                secondaryLabel={t('common.cancel')}
                onSecondaryClick={() => setIsDeleteModalOpen(false)}
            >
                <p className="text-gray-300">
                    {t('apiKeys.modals.deleteDesc')}
                </p>
            </Modal>
        </div>
    );
};

export default ApiKeys;
