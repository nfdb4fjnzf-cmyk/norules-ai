import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
    const { i18n, t } = useTranslation();

    const toggleLanguage = () => {
        const currentLang = i18n.language;
        const newLang = currentLang.startsWith('en') ? 'zh' : 'en';
        i18n.changeLanguage(newLang);
    };

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors w-full"
        >
            <span className="material-symbols-outlined text-xl">language</span>
            <span className="text-sm font-medium">
                {i18n.language.startsWith('en') ? '中文' : 'English'}
            </span>
        </button>
    );
};

export default LanguageSwitcher;
