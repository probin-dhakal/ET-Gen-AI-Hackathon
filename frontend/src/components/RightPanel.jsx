import React, { useState, useEffect } from 'react';
import { Globe, PlayCircle, Loader, AlertCircle } from 'lucide-react';

const RightPanel = ({ activeLanguage, setActiveLanguage, selectedArticle }) => {
  const [translatedArticle, setTranslatedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch translation when language or article changes
  useEffect(() => {
    if (activeLanguage === 'English' || !selectedArticle) {
      setTranslatedArticle(null);
      setError(null);
      return;
    }

    const fetchTranslation = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const languageMap = {
          'Hindi': 'hindi',
          'Tamil': 'tamil',
          'Telugu': 'telugu',
          'Bengali': 'bengali'
        };

        const languageCode = languageMap[activeLanguage];
        if (!languageCode) {
          throw new Error('Unsupported language');
        }

        const response = await fetch(`http://localhost:8000/translate-news/${languageCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            heading: selectedArticle.title || '',
            body: selectedArticle.content || selectedArticle.description || '',
          }),
        });

        if (!response.ok) {
          throw new Error(`Translation failed: ${response.statusText}`);
        }

        const data = await response.json();
        setTranslatedArticle(data);
      } catch (err) {
        console.error('Translation error:', err);
        setError(err.message || 'Failed to translate article');
        setTranslatedArticle(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslation();
  }, [activeLanguage, selectedArticle]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Vernacular Engine */}
      <div className="bg-red-50 p-4 border border-[#cc0000] rounded mb-8">
        <div className="flex items-center space-x-2 mb-3">
          <Globe size={18} className="text-[#cc0000]" />
          <h2 className="font-bold text-sm">Vernacular Context Engine</h2>
        </div>
        <p className="text-xs text-gray-700 mb-2">Translate with local cultural context, not literally.</p>
        <select 
          value={activeLanguage}
          onChange={(e) => setActiveLanguage(e.target.value)}
          className="w-full p-2 text-sm border border-gray-300 rounded focus:border-[#cc0000] focus:outline-none bg-white"
        >
          <option value="English">English</option>
          <option value="Hindi">Hindi (हिंदी)</option>
          <option value="Tamil">Tamil (தமிழ்)</option>
          <option value="Telugu">Telugu (తెలుగు)</option>
          <option value="Bengali">Bengali (বাংলా)</option>
        </select>
      </div>

      {/* Translated Content Display */}
      {activeLanguage !== 'English' && selectedArticle && (
        <div className="bg-amber-50 p-4 border border-amber-200 rounded mb-8">
          {isLoading && (
            <div className="flex items-center space-x-2 text-amber-800">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm font-semibold">Translating to {activeLanguage}...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start space-x-2 text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Translation Error</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {translatedArticle && !isLoading && (
            <div>
              <h3 className="font-serif font-bold text-lg mb-2 leading-snug text-gray-900">
                {translatedArticle.translated_heading}
              </h3>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                {translatedArticle.translated_body}
              </p>
              {translatedArticle.local_context && (
                <div className="bg-white p-2 rounded border-l-2 border-[#cc0000] mt-3">
                  <p className="text-xs font-semibold text-[#cc0000] mb-1">Local Context:</p>
                  <p className="text-xs text-gray-600">
                    {translatedArticle.local_context}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Video Studio */}
      <div>
        <h2 className="font-bold text-2xl mb-4 border-b-2 border-black pb-1">AI Video Studio</h2>
        {selectedArticle ? (
          <>
            <div className="relative group cursor-pointer mb-4">
              <img 
                src={selectedArticle.urlToImage || '/api/placeholder/300/180'} 
                alt="Article" 
                className="w-full rounded object-cover h-48" 
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-all rounded">
                <PlayCircle size={48} className="text-white opacity-80 group-hover:opacity-100" />
              </div>
              <div className="absolute bottom-2 left-2 bg-[#cc0000] text-white text-xs font-bold px-2 py-1 rounded">
                AI Auto-Generated
              </div>
            </div>
            <p className="font-serif font-bold text-lg leading-snug hover:text-[#cc0000] cursor-pointer">
              {selectedArticle.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">Generated from text article in 4 seconds.</p>
          </>
        ) : (
          <div className="p-4 bg-gray-100 rounded text-center">
            <p className="text-sm text-gray-600">Select an article to generate video preview</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightPanel;