import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, PlayCircle, Globe, Activity, FileText, Loader, AlertCircle } from 'lucide-react';

const ArticleDetailView = ({ article, onBack, activeLanguage, setActiveLanguage }) => {
  const [translatedArticle, setTranslatedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const description = article.description || '';
  const content = article.content || '';

  // NewsAPI often appends markers like "[+4666 chars]" to indicate truncated source text.
  const stripNewsApiTruncation = (text) => text.replace(/\s*\[\+\d+\s+chars\]\s*$/, '');

  const cleanDescription = stripNewsApiTruncation(description).trim();
  const cleanContent = stripNewsApiTruncation(content).trim();

  const shouldShowDescription = Boolean(cleanDescription);
  const shouldShowContent = Boolean(cleanContent) && cleanContent !== cleanDescription;

  // Fetch translation when language changes
  useEffect(() => {
    if (activeLanguage === 'English') {
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
          'Bengali': 'bengali',
          'Assamese': 'assamese'
        };

        const languageCode = languageMap[activeLanguage];
        if (!languageCode) {
          throw new Error('Unsupported language');
        }

        const articleBody = cleanContent || cleanDescription || '';
        
        const response = await fetch(`http://localhost:8000/translate-news/${languageCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            heading: article.title || '',
            body: articleBody,
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
  }, [activeLanguage, article, cleanContent, cleanDescription]);

  return (
    <main className="max-w-7xl mx-auto p-4 mt-4">
      <button 
        onClick={onBack}
        className="flex items-center text-sm font-bold text-[#cc0000] hover:underline mb-6"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Personalized Feed
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Expanded Article (Spans 8 cols) */}
        <div className="col-span-1 md:col-span-8 pr-4 border-r border-gray-200">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">
            {article.source?.name || 'ET Bureau'} • Published Today
          </span>
          <h1 className="font-serif text-4xl font-bold leading-tight mb-4">
            {article.title}
          </h1>
          
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-md mb-6 text-indigo-900 text-sm">
            <span className="font-bold block mb-1">Your AI Context:</span>
            {article.aiContext || "This article aligns with your recent focus on sector developments."}
          </div>

          <img 
            src={article.urlToImage || `/api/placeholder/800/400?text=Article+Image`} 
            alt="Article Hero" 
            className="w-full h-auto object-cover rounded mb-6"
          />

          <div className="font-serif text-lg leading-relaxed space-y-4 text-gray-800">
            {shouldShowDescription && <p className="font-bold text-xl">{cleanDescription}</p>}
            {shouldShowContent && <p>{cleanContent}</p>}
            {!shouldShowDescription && !shouldShowContent && (
              <p className="text-gray-600">
                Full article text is not available from this source preview.
              </p>
            )}
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-semibold text-[#cc0000] hover:underline"
              >
                Read full article at source
              </a>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Native Features (Spans 4 cols) */}
        <div className="col-span-1 md:col-span-4 space-y-8">
          
          {/* Feature 1: News Navigator (Interactive Briefing) */}
          <div className="bg-gray-50 p-4 border border-gray-200 rounded">
            <div className="flex items-center space-x-2 mb-3">
              <MessageSquare size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">News Navigator</h2>
            </div>
            <p className="text-sm font-bold mb-2">Interact with this story:</p>
            <div className="space-y-2 text-sm">
              <button className="w-full text-left bg-white border border-gray-300 p-2 rounded hover:border-[#cc0000] hover:text-[#cc0000] transition-colors flex items-center">
                <FileText size={14} className="mr-2" /> Summarize in 3 bullet points
              </button>
              <button className="w-full text-left bg-white border border-gray-300 p-2 rounded hover:border-[#cc0000] hover:text-[#cc0000] transition-colors flex items-center">
                <Activity size={14} className="mr-2" /> How does this impact my portfolio?
              </button>
              <div className="mt-3 relative">
                <input 
                  type="text" 
                  placeholder="Ask a custom follow-up question..." 
                  className="w-full text-xs p-2 border border-gray-300 rounded focus:outline-none focus:border-[#cc0000]"
                />
              </div>
            </div>
          </div>

          {/* Feature 2: AI Video Studio */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <PlayCircle size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">AI Video Brief</h2>
            </div>
            <div className="relative group cursor-pointer">
              <img src="/api/placeholder/300/180?text=Auto-Generated+Video" alt="Video" className="w-full rounded" />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-all rounded">
                <PlayCircle size={48} className="text-white opacity-80 group-hover:opacity-100" />
              </div>
              <div className="absolute bottom-2 left-2 bg-[#cc0000] text-white text-[10px] font-bold px-2 py-1 rounded">
                60-SEC SUMMARY
              </div>
            </div>
          </div>

          {/* Feature 3: Story Arc Tracker */}
          <div className="bg-blue-50 p-4 border border-blue-100 rounded">
            <div className="flex items-center space-x-2 mb-3">
              <Activity size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">Story Arc</h2>
            </div>
            <p className="text-xs text-gray-600 mb-3">AI prediction for this developing story:</p>
            <ul className="space-y-3 border-l-2 border-blue-300 ml-2 pl-3 text-sm">
              <li className="relative">
                <span className="absolute -left-4.25 top-1 h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                <span className="font-semibold block">Now:</span> {article.title.substring(0, 40)}...
              </li>
              <li className="relative">
                <span className="absolute -left-4.25 top-1 h-2.5 w-2.5 rounded-full bg-gray-300"></span>
                <span className="font-semibold text-gray-600 block">Predicted Next:</span> Market correction in related mid-caps.
              </li>
            </ul>
          </div>

          {/* Feature 4: Vernacular Context */}
          <div className="bg-red-50 p-4 border border-[#cc0000] rounded">
            <div className="flex items-center space-x-2 mb-3">
              <Globe size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm">Vernacular Engine</h2>
            </div>
            <select 
              value={activeLanguage}
              onChange={(e) => setActiveLanguage(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded focus:border-[#cc0000] focus:outline-none bg-white"
            >
              <option value="English">Read in English</option>
              <option value="Hindi">Hindi (हिंदी) - Cultural Context</option>
              <option value="Tamil">Tamil (தமிழ்) - Cultural Context</option>
              <option value="Telugu">Telugu (తెలుగు) - Cultural Context</option>
              <option value="Bengali">Bengali (বাংলা) - Cultural Context</option>
              <option value="Assamese">Assamese (অসমীয়া) - Cultural Context</option>
            </select>
            <p className="text-[10px] text-gray-500 mt-2">Translates concepts, not just words.</p>

            {activeLanguage !== 'English' && (
              <div className="mt-4 pt-4 border-t border-red-200">
                {isLoading && (
                  <div className="flex items-center space-x-2 text-red-700">
                    <Loader size={14} className="animate-spin" />
                    <span className="text-xs font-semibold">Translating to {activeLanguage}...</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start space-x-2 text-red-700">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">Translation Error</p>
                      <p className="text-[10px]">{error}</p>
                    </div>
                  </div>
                )}

                {translatedArticle && !isLoading && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-red-900 font-semibold mb-1">Translated Heading:</p>
                      <p className="text-sm font-bold leading-tight text-gray-900">
                        {translatedArticle.translated_heading}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-red-900 font-semibold mb-1">Translated Preview:</p>
                      <p className="text-xs text-gray-700 line-clamp-3">
                        {translatedArticle.translated_body}
                      </p>
                    </div>
                    {translatedArticle.local_context && (
                      <div className="bg-white p-2 rounded border-l-2 border-[#cc0000] text-[10px]">
                        <p className="font-semibold text-[#cc0000] mb-1">Local Context:</p>
                        <p className="text-gray-600">{translatedArticle.local_context}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
};

export default ArticleDetailView;