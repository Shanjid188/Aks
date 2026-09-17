import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({ language: 'en', setLanguage: () => {} });

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      return (localStorage.getItem('aks_language') as Language) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try { localStorage.setItem('aks_language', language); } catch { /* ignore */ }
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
