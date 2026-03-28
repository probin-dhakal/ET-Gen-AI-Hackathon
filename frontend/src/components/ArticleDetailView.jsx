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
import axiosInstance from '../lib/axiosinstance';
import NewsNavigatorModal from './NewsNavigatorModal.jsx';
import { fetchImageFromPexels } from '../lib/imageService';

const ArticleDetailView = ({ article, onBack, activeLanguage, setActiveLanguage }) => {
  const navigate = useNavigate();

  const { 
    getTranslation, 
    relatedArticleList, 
    getArticleById, 
    setArticleId, 
    setCurrentArticle,
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
  const [articleImage, setArticleImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [fallbackArticles, setFallbackArticles] = useState([]);
  const [loadingFallback, setLoadingFallback] = useState(false);
  const [isFullContent, setIsFullContent] = useState(false);

  // --- Category News States ---
  const [categoryNews, setCategoryNews] = useState({
    world: [],
    business: [],
    technology: [],
    healthcare: [],
    india: [],
    education: [],
    environment: []
  });
  const [loadingCategoryNews, setLoadingCategoryNews] = useState({
    world: false,
    business: false,
    technology: false,
    healthcare: false,
    india: false,
    education: false,
    environment: false
  });

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

  // Helper function to break content into random-sized paragraphs
  const getRandomizedParagraphs = (text) => {
    if (!text) return [];
    
    // Split by sentence endings, creating logical breaks
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const paragraphs = [];
    let currentParagraph = '';
    let sentenceCount = 0;
    
    // Randomly group sentences into paragraphs of varying sizes (2-5 sentences per paragraph)
    for (let i = 0; i < sentences.length; i++) {
      currentParagraph += sentences[i];
      sentenceCount++;
      
      // Ensure minimum 2 sentences before considering a break, then randomly decide
      // Use higher threshold (60%+) to create substantial paragraphs
      const minSentences = 2;
      const shouldBreak = sentenceCount >= minSentences && (Math.random() > 0.55 || i === sentences.length - 1);
      
      if (shouldBreak && currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
        sentenceCount = 0;
      }
    }
    
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }
    
    return paragraphs;
  };

  // Helper function to format translated content into paragraphs
  const getTranslatedParagraphs = (text) => {
    if (!text) return [];
    
    // First check if content has paragraph markers (double newlines)
    const explicitParagraphs = text.split(/\n\n+/).filter(p => p.trim());
    if (explicitParagraphs.length > 1) {
      return explicitParagraphs.map(p => p.trim());
    }
    
    // Fallback: split by sentence endings (supporting multiple punctuation marks including Devanagari)
    const sentences = text.match(/[^.!?।]+[.!?।]+/g) || [text];
    const paragraphs = [];
    let currentParagraph = '';
    let sentenceCount = 0;
    
    // Group sentences into paragraphs (3-5 sentences for translated content)
    for (let i = 0; i < sentences.length; i++) {
      currentParagraph += sentences[i];
      sentenceCount++;
      
      const minSentences = 2;
      const shouldBreak = sentenceCount >= minSentences && (Math.random() > 0.5 || i === sentences.length - 1);
      
      if (shouldBreak && currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
        sentenceCount = 0;
      }
    }
    
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }
    
    return paragraphs;
  };

  // Helper function to truncate content after 700 words
  const getTruncatedContent = (text, wordLimit = 500) => {
    if (!text) return '';
    
    const words = text.split(/\s+/);
    if (words.length <= wordLimit) return text;
    
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  // Check if content needs "Read More" button
  const contentWordCount = cleanContent.split(/\s+/).length;
  const needsReadMore = contentWordCount > 500 && !isFullContent;


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

      const imageUrl = await fetchImageFromPexels(rawArticle.heading);

      const mappedArticle = {
        title: rawArticle.heading,
        description: rawArticle.body?.substring(0, 200),
        content: rawArticle.body,
        urlToImage: imageUrl,
        publishedAt: rawArticle.published_at,
        source: { name: rawArticle.source_name || "ET Bureau" }
      };

      navigate(`/article/${id}`, { state: { article: mappedArticle } });
      
      // Scroll to top of page when navigating to new article
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Navigation error:", err);
    }
  };

  useEffect(() => {
    if (article?.id && !article_id) {
      setArticleId(article.id);
    }
  }, [article, article_id, setArticleId]);

  // Store current article data for NewsNavigatorModal
  useEffect(() => {
    if (article?.title) {
      setCurrentArticle(
        article.title,
        article.description || '',
        article.content || ''
      );
    }
  }, [article, setCurrentArticle]);

  useEffect(() => {
    if (article_id) getRelatedArticles();
  }, [article_id, getRelatedArticles]);

  // Fetch fallback articles when related articles are limited
  useEffect(() => {
    const fetchFallbackArticles = async () => {
      try {
        setLoadingFallback(true);
        const response = await axiosInstance.get('/api/feed/latest', {
          params: { limit: 8 }
        });
        
        const articles = response.data?.articles || [];
        const filtered = articles.filter(a => a.id !== article_id).slice(0, 6);
        
        // Fetch images for fallback articles
        const enriched = await Promise.all(
          filtered.map(async (item) => ({
            article_id: item.id,
            title: item.heading,
            summary: item.nucleus_summary || '',
            date: item.created_at,
            urlToImage: await fetchImageFromPexels(item.heading)
          }))
        );
        
        setFallbackArticles(enriched);
      } catch (err) {
        console.error('Error fetching fallback articles:', err);
      } finally {
        setLoadingFallback(false);
      }
    };

    if (article_id) {
      fetchFallbackArticles();
    }
  }, [article_id]);

  // Scroll to top when article changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [article_id]);

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

  // Fetch categorized news
  useEffect(() => {
    const fetchCategoryNews = async () => {
      const categories = ['world', 'business', 'technology', 'healthcare', 'india', 'education', 'environment'];
      const newCategoryNews = { ...categoryNews };

      for (const category of categories) {
        try {
          setLoadingCategoryNews(prev => ({ ...prev, [category]: true }));
          const response = await axiosInstance.get(`/api/articles/category/${category}`, {
            params: { limit: 3 }
          });
          
          const articles = response.data?.articles || [];
          const enriched = await Promise.all(
            articles.map(async (item) => ({
              article_id: item.id,
              title: item.heading,
              summary: item.nucleus_summary || '',
              urlToImage: await fetchImageFromPexels(item.heading),
              publishedAt: item.published_at
            }))
          );
          
          newCategoryNews[category] = enriched;
        } catch (err) {
          console.error(`Error fetching ${category} news:`, err);
          newCategoryNews[category] = [];
        } finally {
          setLoadingCategoryNews(prev => ({ ...prev, [category]: false }));
        }
      }
      
      setCategoryNews(newCategoryNews);
    };

    fetchCategoryNews();
  }, [article_id]);

  // Fetch article image from Pexels
  useEffect(() => {
    if (!article?.title) return;

    const fetchArticleImage = async () => {
      setLoadingImage(true);
      try {
        const imageUrl = await fetchImageFromPexels(article.title);
        setArticleImage(imageUrl);
      } catch (err) {
        console.error('Error fetching article image:', err);
        setArticleImage("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgb(59,130,246);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgb(147,51,234);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3E📰%3C/text%3E%3C/svg%3E");
      } finally {
        setLoadingImage(false);
      }
    };

    fetchArticleImage();
  }, [article?.title]);

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
                {hasTranslatedContent && translatedArticle.translated_nucleus_summary 
                  ? translatedArticle.translated_nucleus_summary 
                  : cleanDescription}
              </p>
            )}
          </div>

          <img 
            src={articleImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgb(59,130,246);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgb(147,51,234);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='400' fill='url(%23grad1)'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='bold'%3E📰%3C/text%3E%3C/svg%3E"} 
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
                <div className="space-y-5">
                  {getTranslatedParagraphs(translatedArticle.translated_body).map((paragraph, idx) => (
                    <p key={idx} className="text-gray-800 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
                
                {translatedArticle.local_context && (
                  <div className="bg-red-50 p-4 border border-[#cc0000] rounded mt-6">
                    <p className="text-xs font-bold uppercase text-[#cc0000] mb-2">Local Context</p>
                    <p className="text-gray-800 leading-relaxed">{translatedArticle.local_context}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-5">
                  {getRandomizedParagraphs(
                    needsReadMore ? getTruncatedContent(cleanContent) : cleanContent
                  ).map((paragraph, idx) => (
                    <p key={idx} className="text-gray-800 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Read More Button */}
                {needsReadMore && (
                  <button
                    onClick={() => setIsFullContent(true)}
                    className="mt-6 px-6 py-2 bg-[#cc0000] text-white font-semibold rounded-lg hover:bg-[#aa0000] transition-colors"
                  >
                    Read More
                  </button>
                )}
              </>
            )}

            {/* Also Read Section */}
            {relatedArticles?.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm font-bold text-gray-600 mb-3">Also read:</p>
                <div className="space-y-3">
                  {relatedArticles.slice(0, 2).map((rel, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRelatedClick(rel.article_id)}
                      className="flex items-start gap-3 text-left hover:opacity-80 transition-opacity group"
                    >
                      <span className="text-blue-600 font-semibold text-sm mt-0.5 flex-shrink-0">•</span>
                      <span className="text-blue-600 hover:text-blue-800 underline text-sm font-semibold line-clamp-2 group-hover:no-underline">
                        {rel.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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

          {/* More Articles Section - 5-6 Articles Grid */}
          {relatedArticleList?.length > 0 && (
            <div className="mt-16 pt-12 border-t-2 border-gray-200">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">More From ET</h2>
                <p className="text-gray-600 text-sm">Explore more business and economic news</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedArticleList.slice(0, 6).map((item, idx) => (
                  <div 
                    key={`${item.article_id}-${idx}`}
                    onClick={() => handleRelatedClick(item.article_id)}
                    className="group cursor-pointer rounded-lg overflow-hidden bg-white border border-gray-200 hover:shadow-lg transition-all duration-300 hover:border-[#cc0000]"
                  >
                    <div className="h-40 bg-gradient-to-br from-blue-500 via-blue-400 to-purple-500 flex items-center justify-center overflow-hidden relative group-hover:from-blue-600 group-hover:via-blue-500 group-hover:to-purple-600 transition-all duration-300">
                      {item.urlToImage ? (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-white text-center opacity-70">
                          <p className="text-2xl font-bold">📰</p>
                          <p className="text-[10px] font-semibold mt-1">Article</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-sm mb-2 line-clamp-2 text-gray-900 group-hover:text-[#cc0000] transition-colors">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                          {item.summary}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                          Read More
                        </span>
                        <span className="text-[#cc0000] font-bold">→</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar - Professional News Layout */}
        <div className="col-span-1 md:col-span-4 space-y-6">
          
          {/* 1. Language Selector - Red Card with Related News Style */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#cc0000] to-red-700 text-white border-b border-red-600">
              <h2 className="font-bold text-base uppercase tracking-wide">Read in Your Language</h2>
              <p className="text-xs text-red-100 mt-0.5">Choose your preferred language</p>
            </div>
            <div className="px-5 py-4">
              <select 
                value={activeLanguage} 
                onChange={(e) => setActiveLanguage(e.target.value)} 
                className="w-full p-3 text-sm font-medium text-gray-900 border-2 border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:ring-opacity-50 focus:border-[#cc0000] bg-white cursor-pointer hover:border-red-300 transition"
              >
                {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Assamese'].map(lang => (
                  <option key={lang} value={lang} className="font-medium">
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Ask About Article */}
          <button 
            onClick={() => setIsNewsNavigatorOpen(true)} 
            className="w-full flex items-center gap-3 p-5 bg-[#cc0000] rounded-lg border-2 border-[#cc0000] hover:bg-red-700 hover:shadow-lg transition-all duration-200 group"
          >
            <MessageSquare size={24} className="text-white flex-shrink-0" />
            <div className="text-left min-w-0">
              <h3 className="font-bold text-base text-white group-hover:text-white transition">Ask AI Questions</h3>
              <p className="text-sm text-red-100">Deep dive on this article →</p>
            </div>
          </button>

          {/* 3. AI Video Brief */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="relative group overflow-hidden bg-gradient-to-br from-purple-900 to-indigo-900 h-[180px] flex items-center justify-center cursor-pointer"
              onClick={!isVideoLoading ? handleGenerateVideo : null}>
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <>
                  <img 
                    src={articleImage || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Cdefs%3E%3ClinearGradient id='grad2' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:rgb(139,92,246);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:rgb(59,130,246);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='225' fill='url(%23grad2)'/%3E%3C/svg%3E"} 
                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-20 transition-opacity" 
                    alt="Thumbnail"
                  />
                  <div className="relative z-10 flex flex-col items-center">
                    {isVideoLoading ? (
                      <>
                        <Loader2 size={36} className="text-white animate-spin" />
                        <span className="text-white text-xs font-bold mt-3">Creating video...</span>
                      </>
                    ) : (
                      <>
                        <div className="bg-[#cc0000]/80 p-3 rounded-full backdrop-blur-sm mb-3 group-hover:bg-[#cc0000] transition">
                          <PlayCircle size={36} className="text-white" />
                        </div>
                        <span className="text-white text-xs font-bold uppercase tracking-wider">Generate 60-Sec Brief</span>
                      </>
                    )}
                  </div>
                </>
              )}
              {videoError && (
                <div className="absolute bottom-0 inset-x-0 bg-red-600/95 text-white text-xs p-2 text-center font-semibold">
                  {videoError}
                </div>
              )}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">AI-Generated Video Summary</p>
            </div>
          </div>

          {/* 4. Story Arc Tracker */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#cc0000] to-red-700 text-white border-b border-red-600 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity size={20} className="text-[#cc0000]" />
                <h2 className="font-bold text-base uppercase tracking-wide text-[#cc0000]">Story Arc Tracker</h2>
              </div>
              <Link to="/story" className="text-red-100 hover:text-white transition-colors">
                <Maximize size={18} />
              </Link>
            </div>
            <div className="p-5">
              <ul className="space-y-4 border-l-3 border-red-200 ml-2 pl-4">
                <li className="relative">
                  <span className="absolute -left-5 top-1.5 h-3 w-3 rounded-full bg-[#cc0000] border-2 border-white shadow-md"></span>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#cc0000] mb-1">Now</div>
                  <p className="text-sm text-gray-700 leading-relaxed">{article.title.substring(0, 50)}...</p>
                </li>
                <li className="relative">
                  <span className="absolute -left-5 top-1.5 h-3 w-3 rounded-full bg-gray-300 border-2 border-white shadow-md"></span>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Predicted</div>
                  <p className="text-sm text-gray-600 leading-relaxed">Regulatory impact assessment incoming.</p>
                </li>
              </ul>
            </div>
          </div>

          {/* 5. Related News - Rich Numbered List with Visual Elements */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#cc0000] to-red-700 text-white border-b border-red-600">
              <h2 className="font-bold text-base uppercase tracking-wide">Related News</h2>
              <p className="text-xs text-red-100 mt-0.5">Top stories right now</p>
            </div>
            <div className="divide-y divide-gray-100">
              {relatedArticleList?.length > 0 ? (
                relatedArticleList.slice(0, 5).map((item, idx) => (
                  <button
                    key={`${item.article_id}-${idx}`}
                    onClick={() => handleRelatedClick(item.article_id)}
                    className="w-full text-left px-5 py-4 hover:bg-red-50 transition-colors duration-200 group flex gap-4 items-start active:bg-red-100"
                  >
                    <div className="flex-shrink-0 flex items-start">
                      <span className="text-[32px] font-black text-red-200 leading-tight group-hover:text-[#cc0000] transition-colors">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#cc0000] transition-colors line-clamp-2 leading-tight">
                        {item.title}
                      </h3>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-gray-500">No related news found</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. More News - Rich Grid with Images and Details */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white border-b border-gray-700">
              <h2 className="font-bold text-base uppercase tracking-wide">More News</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[550px] overflow-y-auto">
              {loadingFallback && relatedArticleList?.length < 3 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 size={24} className="animate-spin text-[#cc0000] mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Loading articles...</p>
                  </div>
                </div>
              ) : relatedArticleList?.length > 2 ? (
                relatedArticleList.slice(2).map((item, idx) => (
                  <button
                    key={`${item.article_id}-${idx}`}
                    onClick={() => handleRelatedClick(item.article_id)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-4 active:bg-gray-100"
                  >
                    {item.urlToImage && (
                      <img 
                        src={item.urlToImage} 
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
                      />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#cc0000] transition-colors line-clamp-2 mb-1.5 leading-tight">
                          {item.title}
                        </h3>
                        {item.summary && (
                          <p className="text-[12px] text-gray-600 line-clamp-1">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : fallbackArticles?.length > 0 ? (
                fallbackArticles.map((item, idx) => (
                  <button
                    key={`fallback-${item.article_id}-${idx}`}
                    onClick={() => handleRelatedClick(item.article_id)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-4 active:bg-gray-100"
                  >
                    {item.urlToImage && (
                      <img 
                        src={item.urlToImage} 
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
                      />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#cc0000] transition-colors line-clamp-2 mb-1.5 leading-tight">
                          {item.title}
                        </h3>
                        {item.summary && (
                          <p className="text-[12px] text-gray-600 line-clamp-1">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500 py-8 px-5 text-center">No articles available</p>
              )}
            </div>
          </div>

          {/* Category News Sections - New Design */}
          {/* World News */}
          {categoryNews.world?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              {/* Category Header */}
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-serif font-bold text-2xl text-gray-900">World <span className="text-red-600 ml-1">›</span></h2>
              </div>
              
              {/* Featured Article */}
              {categoryNews.world[0] && (
                <button
                  onClick={() => handleRelatedClick(categoryNews.world[0].article_id)}
                  className="w-full text-left border-b border-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {categoryNews.world[0].urlToImage && (
                    <img 
                      src={categoryNews.world[0].urlToImage} 
                      alt={categoryNews.world[0].title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg text-gray-900 line-clamp-3">
                      {categoryNews.world[0].title}
                    </h3>
                  </div>
                </button>
              )}

              {/* Other Articles List */}
              {categoryNews.world.length > 1 && (
                <div className="divide-y divide-gray-100">
                  {categoryNews.world.slice(1, 4).map((item, idx) => (
                    <button
                      key={`world-${item.article_id}-${idx}`}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-3 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                      </div>
                      {item.urlToImage && (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded flex-shrink-0 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Business News */}
          {categoryNews.business?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-serif font-bold text-2xl text-gray-900">Business <span className="text-red-600 ml-1">›</span></h2>
              </div>
              {categoryNews.business[0] && (
                <button
                  onClick={() => handleRelatedClick(categoryNews.business[0].article_id)}
                  className="w-full text-left border-b border-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {categoryNews.business[0].urlToImage && (
                    <img 
                      src={categoryNews.business[0].urlToImage} 
                      alt={categoryNews.business[0].title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg text-gray-900 line-clamp-3">
                      {categoryNews.business[0].title}
                    </h3>
                  </div>
                </button>
              )}
              {categoryNews.business.length > 1 && (
                <div className="divide-y divide-gray-100">
                  {categoryNews.business.slice(1, 4).map((item, idx) => (
                    <button
                      key={`business-${item.article_id}-${idx}`}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-3 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                      </div>
                      {item.urlToImage && (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded flex-shrink-0 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Technology News */}
          {categoryNews.technology?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-serif font-bold text-2xl text-gray-900">Technology <span className="text-red-600 ml-1">›</span></h2>
              </div>
              {categoryNews.technology[0] && (
                <button
                  onClick={() => handleRelatedClick(categoryNews.technology[0].article_id)}
                  className="w-full text-left border-b border-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {categoryNews.technology[0].urlToImage && (
                    <img 
                      src={categoryNews.technology[0].urlToImage} 
                      alt={categoryNews.technology[0].title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg text-gray-900 line-clamp-3">
                      {categoryNews.technology[0].title}
                    </h3>
                  </div>
                </button>
              )}
              {categoryNews.technology.length > 1 && (
                <div className="divide-y divide-gray-100">
                  {categoryNews.technology.slice(1, 4).map((item, idx) => (
                    <button
                      key={`technology-${item.article_id}-${idx}`}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-3 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                      </div>
                      {item.urlToImage && (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded flex-shrink-0 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* India News */}
          {categoryNews.india?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-serif font-bold text-2xl text-gray-900">India <span className="text-red-600 ml-1">›</span></h2>
              </div>
              {categoryNews.india[0] && (
                <button
                  onClick={() => handleRelatedClick(categoryNews.india[0].article_id)}
                  className="w-full text-left border-b border-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {categoryNews.india[0].urlToImage && (
                    <img 
                      src={categoryNews.india[0].urlToImage} 
                      alt={categoryNews.india[0].title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg text-gray-900 line-clamp-3">
                      {categoryNews.india[0].title}
                    </h3>
                  </div>
                </button>
              )}
              {categoryNews.india.length > 1 && (
                <div className="divide-y divide-gray-100">
                  {categoryNews.india.slice(1, 4).map((item, idx) => (
                    <button
                      key={`india-${item.article_id}-${idx}`}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-3 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                      </div>
                      {item.urlToImage && (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded flex-shrink-0 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Education News */}
          {categoryNews.education?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-serif font-bold text-2xl text-gray-900">Education <span className="text-red-600 ml-1">›</span></h2>
              </div>
              {categoryNews.education[0] && (
                <button
                  onClick={() => handleRelatedClick(categoryNews.education[0].article_id)}
                  className="w-full text-left border-b border-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {categoryNews.education[0].urlToImage && (
                    <img 
                      src={categoryNews.education[0].urlToImage} 
                      alt={categoryNews.education[0].title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg text-gray-900 line-clamp-3">
                      {categoryNews.education[0].title}
                    </h3>
                  </div>
                </button>
              )}
              {categoryNews.education.length > 1 && (
                <div className="divide-y divide-gray-100">
                  {categoryNews.education.slice(1, 4).map((item, idx) => (
                    <button
                      key={`education-${item.article_id}-${idx}`}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-3 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                      </div>
                      {item.urlToImage && (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded flex-shrink-0 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Environment News */}
          {categoryNews.environment?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-serif font-bold text-2xl text-gray-900">Environment <span className="text-red-600 ml-1">›</span></h2>
              </div>
              {categoryNews.environment[0] && (
                <button
                  onClick={() => handleRelatedClick(categoryNews.environment[0].article_id)}
                  className="w-full text-left border-b border-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {categoryNews.environment[0].urlToImage && (
                    <img 
                      src={categoryNews.environment[0].urlToImage} 
                      alt={categoryNews.environment[0].title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg text-gray-900 line-clamp-3">
                      {categoryNews.environment[0].title}
                    </h3>
                  </div>
                </button>
              )}
              {categoryNews.environment.length > 1 && (
                <div className="divide-y divide-gray-100">
                  {categoryNews.environment.slice(1, 4).map((item, idx) => (
                    <button
                      key={`environment-${item.article_id}-${idx}`}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-3 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                      </div>
                      {item.urlToImage && (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded flex-shrink-0 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Healthcare News */}
          {categoryNews.healthcare?.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-serif font-bold text-2xl text-gray-900">Healthcare <span className="text-red-600 ml-1">›</span></h2>
              </div>
              {categoryNews.healthcare[0] && (
                <button
                  onClick={() => handleRelatedClick(categoryNews.healthcare[0].article_id)}
                  className="w-full text-left border-b border-gray-100 overflow-hidden hover:opacity-90 transition-opacity"
                >
                  {categoryNews.healthcare[0].urlToImage && (
                    <img 
                      src={categoryNews.healthcare[0].urlToImage} 
                      alt={categoryNews.healthcare[0].title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-serif font-bold text-lg text-gray-900 line-clamp-3">
                      {categoryNews.healthcare[0].title}
                    </h3>
                  </div>
                </button>
              )}
              {categoryNews.healthcare.length > 1 && (
                <div className="divide-y divide-gray-100">
                  {categoryNews.healthcare.slice(1, 4).map((item, idx) => (
                    <button
                      key={`healthcare-${item.article_id}-${idx}`}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors duration-200 group flex gap-3 active:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-semibold text-sm text-gray-900 group-hover:text-gray-600 transition-colors line-clamp-3">
                          {item.title}
                        </h3>
                      </div>
                      {item.urlToImage && (
                        <img 
                          src={item.urlToImage} 
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded flex-shrink-0 shadow-sm"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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