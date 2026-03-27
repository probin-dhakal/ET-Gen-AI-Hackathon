import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  PlayCircle, 
  Globe, 
  Activity, 
  Loader, 
  AlertCircle, 
  Maximize, 
  Loader2 
} from 'lucide-react';
import { useArticleStore } from '../store/useArticle';
import { Link, useNavigate } from 'react-router-dom';
import NewsNavigatorModal from './NewsNavigatorModal.jsx';

const ArticleDetailView = ({ article, onBack, activeLanguage, setActiveLanguage }) => {
  const navigate = useNavigate();

  const { 
    getTranslation, 
    relatedArticleList, 
    getArticleById, 
    setArticleId, 
    article_id, 
    relatedArticles, 
    loadingRelated, 
    getRelatedArticles 
  } = useArticleStore();

  // --- State Management ---
  const [translatedArticle, setTranslatedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNewsNavigatorOpen, setIsNewsNavigatorOpen] = useState(false);

  // --- 🎥 Video Generation States ---
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoError, setVideoError] = useState(null);

  // --- Text Processing ---
  const description = article.description || '';
  const content = article.content || '';
  const stripNewsApiTruncation = (text) => text.replace(/\s*\[\+\d+\s+chars\]\s*$/, '');
  const cleanDescription = stripNewsApiTruncation(description).trim();
  const cleanContent = stripNewsApiTruncation(content).trim();

  const shouldShowDescription = Boolean(cleanDescription);
  const isVernacularSelected = activeLanguage !== 'English';
  const hasTranslatedContent = Boolean(translatedArticle && !isLoading && !error);

  // --- 🚀 Video Generation Handler ---
  const handleGenerateVideo = async () => {
    setIsVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null); // Clear previous video if switching languages

    try {
      const response = await fetch("http://127.0.0.1:8000/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article: cleanContent || cleanDescription,
          title: article.title,
          language: activeLanguage.toLowerCase()
        }),
      });

      const result = await response.json();

      if (result.status === "success" && result.data?.videoUrl) {
        // ✅ Capturing the exact URL returned by your backend
        setVideoUrl(result.data.videoUrl);
      } else {
        throw new Error(result.detail || "Video generation failed at backend.");
      }
    } catch (err) {
      console.error("Video Gen Error:", err);
      setVideoError("Could not generate video. Ensure backend and Remotion are running.");
    } finally {
      setIsVideoLoading(false);
    }
  };

  // --- Navigation & Data Loading ---
  const handleRelatedClick = async (id) => {
    try {
      const rawArticle = await getArticleById(id);
      setArticleId(id);
      if (!rawArticle) return;

      const mappedArticle = {
        title: rawArticle.heading,
        description: rawArticle.body?.substring(0, 200),
        content: rawArticle.body,
        urlToImage: rawArticle.image_url,
        publishedAt: rawArticle.published_at,
        source: { name: rawArticle.source_name || "ET Bureau" }
      };

      navigate(`/article/${id}`, { state: { article: mappedArticle } });
    } catch (err) {
      console.error("Navigation error:", err);
    }
  };

  useEffect(() => {
    if (article?.id && !article_id) {
      setArticleId(article.id);
    }
  }, [article, article_id, setArticleId]);

  useEffect(() => {
    if (article_id) getRelatedArticles();
  }, [article_id, getRelatedArticles]);

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
          'Hindi': 'hindi', 'Tamil': 'tamil', 'Telugu': 'telugu', 
          'Bengali': 'bengali', 'Assamese': 'assamese' 
        };
        const response = await getTranslation(languageMap[activeLanguage]);
        if (response) setTranslatedArticle(response.translation);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTranslation();
  }, [activeLanguage, article_id]);

  return (
    <main className="max-w-7xl mx-auto p-4 mt-4">
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="flex items-center text-sm font-bold text-[#cc0000] hover:underline mb-6"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Personalized Feed
      </button>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Article */}
        <div className="col-span-1 md:col-span-8 pr-4 border-r border-gray-200">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">
            {article.source?.name || 'ET Bureau'} • Published Today
          </span>

          <div className="mb-6">
            <h1 className="font-serif text-4xl font-bold leading-tight mb-3 text-gray-900">
              {hasTranslatedContent ? translatedArticle.translated_heading : article.title}
            </h1>
            {shouldShowDescription && (
              <p className="text-lg text-gray-700 leading-relaxed font-medium border-l-4 border-[#cc0000] pl-4">
                {cleanDescription}
              </p>
            )}
          </div>

          <img 
            src={article.urlToImage || `/api/placeholder/800/400`} 
            className="w-full h-auto object-cover rounded mb-6" 
            alt="Hero"
          />

          <div className="font-serif text-lg leading-relaxed space-y-4 text-gray-800">
            {isVernacularSelected && isLoading && (
              <div className="flex items-center space-x-2 text-[#cc0000]">
                <Loader size={18} className="animate-spin" />
                <p>Translating to {activeLanguage}...</p>
              </div>
            )}
            
            {hasTranslatedContent ? (
              <>
                <p>{translatedArticle.translated_body}</p>
                {translatedArticle.local_context && (
                  <div className="bg-red-50 p-4 border border-[#cc0000] rounded">
                    <p className="text-xs font-bold uppercase text-[#cc0000] mb-2">Local Context</p>
                    <p>{translatedArticle.local_context}</p>
                  </div>
                )}
              </>
            ) : (
              <p>{cleanContent || "Full content unavailable."}</p>
            )}
          </div>

          {/* Related Articles (Grid View) */}
          {relatedArticles?.length > 0 && (
            <div className="mt-12 pt-8 border-t-2 border-gray-200">
              <h2 className="text-2xl font-bold mb-6">Related Stories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {relatedArticles.map((rel) => (
                  <div 
                    key={rel.article_id} 
                    onClick={() => handleRelatedClick(rel.article_id)} 
                    className="p-4 bg-gray-50 border rounded-lg cursor-pointer hover:border-[#cc0000] transition-colors"
                  >
                    <h3 className="font-semibold mb-2 line-clamp-2">{rel.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{rel.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI Sidebar */}
        <div className="col-span-1 md:col-span-4 space-y-8">
          
          {/* 1. AI Navigator Button */}
          <button 
            onClick={() => setIsNewsNavigatorOpen(true)} 
            className="w-full flex items-center justify-between p-4 bg-blue-50 border-2 border-[#cc0000] rounded-lg shadow-sm hover:bg-blue-100 transition-all"
          >
            <div className="flex items-center space-x-3">
              <MessageSquare size={20} className="text-[#cc0000]" />
              <div className="text-left">
                <h2 className="font-bold text-sm uppercase">AI News Navigator</h2>
                <p className="text-xs text-gray-600">Deep dive with AI Q&A</p>
              </div>
            </div>
            <span className="text-[#cc0000] font-bold text-xl">→</span>
          </button>

          {/* 2. 🎬 AI Video Brief (Integrated with Azure Backend) */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <PlayCircle size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">AI Video Brief</h2>
            </div>
            
            <div className="relative group overflow-hidden rounded-lg bg-black min-h-[200px] flex items-center justify-center border border-gray-200 shadow-inner">
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain rounded-lg" 
                />
              ) : (
                <div 
                  onClick={!isVideoLoading ? handleGenerateVideo : null}
                  className={`relative w-full h-[200px] flex items-center justify-center ${!isVideoLoading ? 'cursor-pointer' : 'cursor-wait'}`}
                >
                  <img 
                    src={article.urlToImage || `/api/placeholder/400/225`} 
                    className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-30 transition-opacity" 
                    alt="Thumbnail"
                  />
                  <div className="relative z-10 flex flex-col items-center p-4">
                    {isVideoLoading ? (
                      <>
                        <Loader2 size={44} className="text-white animate-spin mb-3" />
                        <span className="text-white text-[10px] font-bold tracking-widest uppercase text-center">
                          Rendering AI Brief...
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="bg-white/10 p-3 rounded-full backdrop-blur-md mb-3">
                          <PlayCircle size={44} className="text-white" />
                        </div>
                        <span className="text-white text-xs font-bold bg-[#cc0000] px-4 py-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                          GENERATE 60-SEC BRIEF
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {videoError && (
                <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-[10px] p-2 text-center flex items-center justify-center gap-1">
                  <AlertCircle size={12} /> {videoError}
                </div>
              )}
            </div>
          </div>

          {/* 3. Story Arc Tracker */}
          <div className="relative bg-blue-50 p-4 border border-blue-100 rounded">
            <Link to="/story" className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
              <Maximize size={18} />
            </Link>
            <div className="flex items-center space-x-2 mb-3">
              <Activity size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm uppercase">Story Arc</h2>
            </div>
            <ul className="space-y-3 border-l-2 border-blue-200 ml-2 pl-3 text-sm">
              <li className="relative">
                <span className="absolute -left-4.25 top-1.5 h-2 w-2 rounded-full bg-blue-500"></span>
                <span className="font-semibold block">Now:</span> 
                {article.title.substring(0, 45)}...
              </li>
              <li className="relative text-gray-500">
                <span className="absolute -left-4.25 top-1.5 h-2 w-2 rounded-full bg-gray-300"></span>
                <span className="font-semibold block">Predicted:</span> 
                Regulatory impact assessment incoming.
              </li>
            </ul>
          </div>

          {/* 4. Side List: Related Stories */}
          <div className="bg-gray-50 p-4 border rounded">
            <h2 className="font-bold text-sm uppercase text-gray-500 mb-3">Related</h2>
            {loadingRelated ? (
              <Loader2 className="animate-spin text-[#cc0000]" size={20} />
            ) : (
              <ul className="space-y-3">
                {relatedArticleList?.slice(0, 4).map((item, idx) => (
                  <li 
                    key={idx} 
                    onClick={() => handleRelatedClick(item.article_id)} 
                    className="cursor-pointer hover:text-[#cc0000] text-sm font-semibold border-b border-gray-100 pb-2 last:border-none"
                  >
                    {item.title}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 5. Vernacular Engine Selector */}
          <div className="bg-red-50 p-4 border border-[#cc0000] rounded shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Globe size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm">Vernacular Engine</h2>
            </div>
            <select 
              value={activeLanguage} 
              onChange={(e) => setActiveLanguage(e.target.value)} 
              className="w-full p-2 text-sm border rounded focus:border-[#cc0000] bg-white outline-none"
            >
              {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Assamese'].map(lang => (
                <option key={lang} value={lang}>
                  {lang === 'English' ? 'Read in English' : `${lang} - Localized`}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-2 italic">AI translates intent and cultural context.</p>
          </div>

        </div>
      </div>

      {/* News Navigator Modal */}
      <NewsNavigatorModal 
        isOpen={isNewsNavigatorOpen} 
        onClose={() => setIsNewsNavigatorOpen(false)} 
      />
    </main>
  );
};

export default ArticleDetailView;