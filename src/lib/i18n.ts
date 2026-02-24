// Multi-language support

export type Language = 'en' | 'hi' | 'gu' | 'mr' | 'ta';

const STORAGE_KEY = 'valoquick_language';

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem(STORAGE_KEY) as Language) || 'en';
}

export function setStoredLanguage(lang: Language) {
  localStorage.setItem(STORAGE_KEY, lang);
}

// Translation dictionary
const translations = {
  // Navigation & Buttons
  'backToDashboard': { en: 'Back to Dashboard', hi: 'डैशबोर्ड पर वापस' },
  'valuationReport': { en: 'Valuation Report', hi: 'मूल्यांकन रिपोर्ट' },
  'reportSections': { en: 'Report Sections', hi: 'रिपोर्ट अनुभाग' },
  'previewReport': { en: 'Preview Report', hi: 'रिपोर्ट पूर्वावलोकन' },
  'newReport': { en: 'New Report', hi: 'नई रिपोर्ट' },
  'saving': { en: 'Saving...', hi: 'सेव हो रहा है...' },
  'autoSaving': { en: 'Auto-saving...', hi: 'ऑटो-सेव...' },
  'saved': { en: 'Saved', hi: 'सेव हो गया' },
  'previous': { en: 'Previous', hi: 'पिछला' },
  'next': { en: 'Next', hi: 'अगला' },
  'loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },

  // Step Names (Form Sections)
  'stepProperty': { en: 'Property', hi: 'संपत्ति' },
  'stepPropertyFull': { en: 'Property Details', hi: 'संपत्ति विवरण' },
  'stepValuation': { en: 'Valuation', hi: 'मूल्यांकन' },
  'stepValuationFull': { en: 'Valuation Parameters', hi: 'मूल्यांकन पैरामीटर' },
  'stepSpecs': { en: 'Specs', hi: 'विशेषताएं' },
  'stepSpecsFull': { en: 'Building Specifications', hi: 'भवन विशेषताएं' },
  'stepLegal': { en: 'Legal', hi: 'कानूनी' },
  'stepLegalFull': { en: 'Legal & Regulatory', hi: 'कानूनी और नियामक' },
  'stepInfra': { en: 'Infra', hi: 'बुनियादी' },
  'stepInfraFull': { en: 'Infrastructure', hi: 'बुनियादी ढांचा' },
  'stepEconomic': { en: 'Economic', hi: 'आर्थिक' },
  'stepEconomicFull': { en: 'Economic Details', hi: 'आर्थिक विवरण' },
  'stepPhotos': { en: 'Photos', hi: 'फोटो' },
  'stepPhotosFull': { en: 'Photos & Location', hi: 'फोटो और स्थान' },

  // Form Card Titles
  'propertyAddress': { en: 'Property Address', hi: 'संपत्ति का पता' },
  'physicalCharacteristics': { en: 'Physical Characteristics', hi: 'भौतिक विशेषताएं' },
  'propertyBoundaries': { en: 'Property Boundaries', hi: 'संपत्ति की सीमाएं' },
  'propertyClassification': { en: 'Property Classification', hi: 'संपत्ति का वर्गीकरण' },
  'nearbyCivicAmenities': { en: 'Nearby Civic Amenities', hi: 'निकटवर्ती नागरिक सुविधाएं' },
  'originalOwner': { en: 'Original Owner', hi: 'मूल मालिक' },
  'currentOwners': { en: 'Current Owners', hi: 'वर्तमान मालिक' },
  'referenceDetails': { en: 'Reference Details', hi: 'संदर्भ विवरण' },
  'landDetails': { en: 'Land Details', hi: 'भूमि विवरण' },
  'constructionDetails': { en: 'Construction Details', hi: 'निर्माण विवरण' },
  'depreciation': { en: 'Depreciation', hi: 'मूल्यह्रास' },
  'liveCalcPreview': { en: 'Live Calculation Preview', hi: 'लाइव गणना पूर्वावलोकन' },
  'marketabilityAssessment': { en: 'Marketability Assessment', hi: 'विपणन योग्यता आकलन' },
  'valuationSummary': { en: 'Valuation Summary', hi: 'मूल्यांकन सारांश' },
  'buildingSpecifications': { en: 'Building Specifications', hi: 'भवन विशेषताएं' },
  'sanitaryUtilities': { en: 'Sanitary & Utilities', hi: 'स्वच्छता और उपयोगिताएं' },
  'compoundWall': { en: 'Compound Wall', hi: 'परिसर की दीवार' },
  'legalRegulatory': { en: 'Legal & Regulatory', hi: 'कानूनी और नियामक' },
  'infrastructureUtilities': { en: 'Infrastructure & Utilities', hi: 'बुनियादी ढांचा और उपयोगिताएं' },
  'environmentalSafety': { en: 'Environmental & Safety', hi: 'पर्यावरण और सुरक्षा' },
  'economicRentalDetails': { en: 'Economic & Rental Details', hi: 'आर्थिक और किराये का विवरण' },
  'propertyPhotos': { en: 'Property Photos', hi: 'संपत्ति की फोटो' },
  'propertyLocation': { en: 'Property Location', hi: 'संपत्ति का स्थान' },

  // Dashboard
  'dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'totalReports': { en: 'Total Reports', hi: 'कुल रिपोर्ट' },
  'inProgress': { en: 'In Progress', hi: 'प्रगति में' },
  'completed': { en: 'Completed', hi: 'पूर्ण' },
  'activeReports': { en: 'Active Reports', hi: 'सक्रिय रिपोर्ट' },
  'concludedReports': { en: 'Concluded Reports', hi: 'संपन्न रिपोर्ट' },
  'noActiveReports': { en: 'No active reports', hi: 'कोई सक्रिय रिपोर्ट नहीं' },
  'noConcludedReports': { en: 'No concluded reports yet', hi: 'अभी तक कोई संपन्न रिपोर्ट नहीं' },
  'createFirst': { en: 'Create your first valuation report to get started.', hi: 'शुरू करने के लिए अपनी पहली मूल्यांकन रिपोर्ट बनाएं।' },
  'reopen': { en: 'Reopen', hi: 'फिर से खोलें' },
  'downloadPdf': { en: 'Download PDF', hi: 'PDF डाउनलोड करें' },
  'complete': { en: 'complete', hi: 'पूर्ण' },
  'branding': { en: 'Branding', hi: 'ब्रांडिंग' },
  'team': { en: 'Team', hi: 'टीम' },
  'subscription': { en: 'Subscription', hi: 'सदस्यता' },
  'signOut': { en: 'Sign Out', hi: 'साइन आउट' },

  // Welcome Tour
  'welcomeTitle': { en: 'Welcome to ValuQuick', hi: 'ValuQuick में आपका स्वागत है' },
  'welcomeSubtitle': { en: "Here's how to get started in 3 simple steps", hi: '3 आसान चरणों में शुरू करें' },
  'step1Title': { en: 'Create Your First Report', hi: 'अपनी पहली रिपोर्ट बनाएं' },
  'step1Desc': { en: 'Click "New Report" to start a valuation. Fill in property details, add photos, and generate a bank-ready PDF.', hi: '"नई रिपोर्ट" पर क्लिक करके मूल्यांकन शुरू करें। संपत्ति विवरण भरें, फोटो जोड़ें, और बैंक-तैयार PDF बनाएं।' },
  'step2Title': { en: 'Customize Your Branding', hi: 'अपनी ब्रांडिंग कस्टमाइज़ करें' },
  'step2Desc': { en: 'Add your firm logo, choose colors, and set header/footer text. Your reports will carry your professional identity.', hi: 'अपनी फर्म का लोगो जोड़ें, रंग चुनें, और हेडर/फुटर टेक्स्ट सेट करें।' },
  'step3Title': { en: 'Invite Your Team', hi: 'अपनी टीम को आमंत्रित करें' },
  'step3Desc': { en: 'Add colleagues to your firm so they can create reports too. Each member gets their own login.', hi: 'अपने सहकर्मियों को जोड़ें ताकि वे भी रिपोर्ट बना सकें।' },

  // Report Editor
  'backToForm': { en: 'Back to Form', hi: 'फॉर्म पर वापस' },
  'clickToEdit': { en: 'Click any text to edit', hi: 'संपादित करने के लिए किसी भी टेक्स्ट पर क्लिक करें' },
  'exportPdf': { en: 'Export PDF', hi: 'PDF निर्यात करें' },
  'exporting': { en: 'Exporting...', hi: 'निर्यात हो रहा है...' },

  // Photo section
  'dragDropPhotos': { en: 'Drag & drop photos here, or tap to select', hi: 'यहां फोटो खींचें और छोड़ें, या चुनने के लिए टैप करें' },
  'uploadingPhotos': { en: 'Uploading', hi: 'अपलोड हो रहा है' },
  'photoOf': { en: 'Photo', hi: 'फोटो' },

  // Hidden fields
  'hiddenFields': { en: 'Hidden Fields', hi: 'छिपे हुए फ़ील्ड' },
  'restoreAll': { en: 'Restore All', hi: 'सभी पुनर्स्थापित करें' },

  // Misc
  'addOwner': { en: 'Add Owner', hi: 'मालिक जोड़ें' },
  'remove': { en: 'Remove', hi: 'हटाएं' },
  'captureLocation': { en: 'Capture Current Location', hi: 'वर्तमान स्थान कैप्चर करें' },
  'locationCaptured': { en: 'Location Captured', hi: 'स्थान कैप्चर हो गया' },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language): string {
  const entry = translations[key] as Record<string, string> | undefined;
  if (!entry) return key;
  return entry[lang] || entry.en;
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'EN',
  hi: 'हि',
  gu: 'ગુ',
  mr: 'म',
  ta: 'த',
};
