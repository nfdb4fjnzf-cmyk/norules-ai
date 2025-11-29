import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import SkeletonLoader from '../../components/SkeletonLoader';
import { encryptLocal, decryptLocal } from '../../utils/encryption';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';

const ExternalKey: React.FC = () => {
    const { t } = useTranslation();
    const [key, setKey] = useState('');
    const [savedKey, setSavedKey] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        loadKey();
    }, []);

    const loadKey = async () => {
        try {
            const storedEncrypted = localStorage.getItem('custom_api_key');
            if (storedEncrypted) {
                const plain = await decryptLocal(storedEncrypted);
                setKey(plain);
                setSavedKey(true);
            }
        } catch (e) {
            console.error("Failed to decrypt key", e);
            localStorage.removeItem('custom_api_key');
            setSavedKey(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!key.trim()) {
            showToast('error', t('settings.externalKey.messages.enterKey'));
            return;
        }
        try {
            const encrypted = await encryptLocal(key.trim());
            localStorage.setItem('custom_api_key', encrypted);
            setSavedKey(true);
            showToast('success', t('settings.externalKey.messages.saved'));
        } catch (e) {
            showToast('error', t('settings.externalKey.messages.encryptionFailed'));
        }
    };

    const handleDelete = () => {
        localStorage.removeItem('custom_api_key');
        setSavedKey(false);
        setKey('');
        showToast('success', t('settings.externalKey.messages.removed'));
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">{t('settings.externalKey.title')}</h1>
                <p className="text-secondary text-sm">{t('settings.externalKey.subtitle')}</p>
            </div>

            <Card>
                {loading ? (
                    <CardContent className="space-y-4 pt-6">
                        <SkeletonLoader type="text" className="w-1/3" />
                        <SkeletonLoader type="large" className="h-12" />
                        <SkeletonLoader type="button" className="w-24" />
                    </CardContent>
                ) : (
                    <CardContent className="space-y-6 pt-6">
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                            <span className="material-symbols-outlined text-primary mt-0.5">lock</span>
                            <div>
                                <h3 className="text-primary font-semibold text-sm mb-1">{t('settings.externalKey.encryption.title')}</h3>
                                <p className="text-primary/80 text-sm leading-relaxed">
                                    {t('settings.externalKey.encryption.description')}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="api-key">
                                {t('settings.externalKey.label')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="api-key"
                                    type="password"
                                    value={key}
                                    onChange={(e) => setKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="font-mono pr-24"
                                />
                                {savedKey && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Badge variant="success" className="gap-1">
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                            {t('settings.externalKey.status.saved')}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-secondary">
                                {t('settings.externalKey.storageNote')}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <Button
                                onClick={handleSave}
                                className="gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">save</span>
                                {t('settings.externalKey.actions.save')}
                            </Button>

                            {savedKey && (
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    className="gap-2"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    {t('settings.externalKey.actions.remove')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
};

export default ExternalKey;
