import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, PlayCircle, Globe, Activity, FileText, Loader, AlertCircle, Maximize, Loader2 } from 'lucide-react';
import { useArticleStore } from '../store/useArticle';
import { Link, useNavigate } from 'react-router-dom';
import NewsNavigatorModal from './NewsNavigatorModal.jsx';

const ArticleDetailView = ({ article, onBack, activeLanguage, setActiveLanguage }) => {

  const navigate = useNavigate();

  const { getTranslation, relatedArticleList, getArticleById, setArticleId, article_id, relatedArticles, loadingRelated, getRelatedArticles } = useArticleStore();
  const [translatedArticle, setTranslatedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNewsNavigatorOpen, setIsNewsNavigatorOpen] = useState(false);



  const description = article.description || '';
  const content = article.content || '';

  // NewsAPI often appends markers like "[+4666 chars]" to indicate truncated source text.
  const stripNewsApiTruncation = (text) => text.replace(/\s*\[\+\d+\s+chars\]\s*$/, '');

  const cleanDescription = stripNewsApiTruncation(description).trim();
  const cleanContent = stripNewsApiTruncation(content).trim();

  const shouldShowDescription = Boolean(cleanDescription);
  const shouldShowContent = Boolean(cleanContent) && cleanContent !== cleanDescription;
  const isVernacularSelected = activeLanguage !== 'English';
  const hasTranslatedContent = Boolean(translatedArticle && !isLoading && !error);

  const handleRelatedClick = async (article_id) => {
    try {
      const rawArticle = await getArticleById(article_id);
      setArticleId(article_id);

      if (!rawArticle) return;

      const article = {
        title: rawArticle.heading,
        description: rawArticle.body?.substring(0, 200),
        content: rawArticle.body,
        author: rawArticle.author,
        url: rawArticle.source_url,
        urlToImage: rawArticle.image_url,
        publishedAt: rawArticle.published_at,
        source: {
          name: rawArticle.source_name || "ET Bureau"
        }
      };

      navigate(`/article/${article_id}`, { state: { article } });

    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  // Initialize article_id when component receives new article
  useEffect(() => {
    if (article && article.id && !article_id) {
      setArticleId(article.id);
      console.log("Set article_id from article prop:", article.id);
    }
  }, [article, article_id, setArticleId]);

  // useEffect(() => {
  //   const loadTimeline = async () => {
  //     await getKeywordTimeline();
  //   };

  //   loadTimeline();
  // }, [article_id]);

  // Fetch related articles when article changes
  useEffect(() => {
    if (article_id) {
      console.log("Fetching related articles for article_id:", article_id);
      getRelatedArticles();
    }
  }, [article_id, getRelatedArticles]);

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

        if (!article_id) {
          // Wait for addArticle/setArticleId to finish; effect will rerun once article_id is ready.
          return;
        }

        const response = await getTranslation(languageCode);

        if (!response || !response.translation) {
          throw new Error("Translation failed");
        }

        setTranslatedArticle(response.translation);
      } catch (err) {
        console.error('Translation error:', err);
        let errorMessage = err.message;

        // Handle common errors
        if (errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Backend server is not reachable. Start it with: uvicorn main:app --reload --port 8001 (or 8000).';
        } else if (errorMessage.includes('AZURE_OPENAI_API_KEY') || errorMessage.includes('GEMINI_API_KEY')) {
          errorMessage = 'API key not configured. Set AZURE_OPENAI_API_KEY environment variable.';
        } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('Quota exceeded') || errorMessage.includes('429')) {
          errorMessage = 'Translation quota exceeded for the configured AI provider. Please add billing/credits or switch to a key with available quota.';
        }

        setError(errorMessage);
        setTranslatedArticle(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslation();
  }, [activeLanguage, article, cleanContent, cleanDescription, article_id]);

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

          {/* Article Heading & Short Description Section */}
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
            {isVernacularSelected && isLoading && (
              <div className="flex items-center space-x-2 text-[#cc0000]">
                <Loader size={18} className="animate-spin" />
                <p className="text-base font-semibold">Translating article to {activeLanguage}...</p>
              </div>
            )}

            {isVernacularSelected && error && (
              <div className="flex items-start space-x-2 text-red-700 bg-red-50 border border-red-200 rounded p-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Translation Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {hasTranslatedContent ? (
              <>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#cc0000] mb-2">Translated Preview</p>
                  <p>{translatedArticle.translated_body}</p>
                </div>
                {translatedArticle.local_context && (
                  <div className="bg-red-50 p-4 border border-[#cc0000] rounded">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#cc0000] mb-2">Local Context</p>
                    <p className="text-base leading-relaxed text-gray-800">{translatedArticle.local_context}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {shouldShowDescription && <p className="font-bold text-xl">{cleanDescription}</p>}
                {shouldShowContent && <p>{cleanContent}</p>}
                {!shouldShowDescription && !shouldShowContent && (
                  <p className="text-gray-600">
                    Full article text is not available from this source preview.
                  </p>
                )}
              </>
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

          {/* Related Articles Section */}
          {(relatedArticles && relatedArticles.length > 0) && (
            <div className="mt-12 pt-8 border-t-2 border-gray-200">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {relatedArticles.map((relatedArticle) => (
                  <div
                    key={relatedArticle.article_id}
                    onClick={() => handleRelatedClick(relatedArticle.article_id)}
                    className="p-4 bg-linear-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg hover:shadow-lg hover:border-[#cc0000] transition-all cursor-pointer group"
                  >
                    {/* Article Title */}
                    <h3 className="font-semibold text-base text-gray-900 group-hover:text-[#cc0000] mb-3 line-clamp-2 leading-tight">
                      {relatedArticle.title}
                    </h3>

                    {/* Article Summary */}
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                      {relatedArticle.summary}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-600 pt-3 border-t border-gray-200">
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-medium">
                        🔗 {relatedArticle.shared_keywords} shared keyword{relatedArticle.shared_keywords !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-500">
                        {new Date(relatedArticle.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingRelated && (
            <div className="mt-12 pt-8 border-t-2 border-gray-200 flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-[#cc0000] mr-2" />
              <span className="text-gray-600 font-medium">Loading related articles...</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AI Native Features (Spans 4 cols) */}
        <div className="col-span-1 md:col-span-4 space-y-8">

          {/* Feature 1: AI News Navigator Modal */}
          <div className="mt-6">
            <button
              onClick={() => setIsNewsNavigatorOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-blue-100 border-2 border-[#cc0000] rounded-lg hover:from-blue-100 hover:to-blue-150 transition-all group cursor-pointer shadow-md"
            >
              <div className="flex items-center space-x-3">
                <MessageSquare size={20} className="text-[#cc0000]" />
                <div className="text-left">
                  <h2 className="font-bold text-sm tracking-wider uppercase text-gray-700">AI News Navigator</h2>
                  <p className="text-xs text-gray-600">Deep dive with AI-powered Q&A</p>
                </div>
              </div>
              <span className="text-[#cc0000] font-bold text-xl group-hover:scale-125 transition-transform">→</span>
            </button>
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
          <div className="relative bg-blue-50 p-4 border border-blue-100 rounded">

            {/* Expand Icon */}
            <Link to="/story" className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
              <Maximize size={20} />
            </Link>

            <div className="flex items-center space-x-2 mb-3">
              <Activity size={18} className="text-[#cc0000]" />
              <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">
                Story Arc
              </h2>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              AI prediction for this developing story:
            </p>

            <ul className="space-y-3 border-l-2 border-blue-300 ml-2 pl-3 text-sm">
              <li className="relative">
                <span className="absolute -left-4.25 top-1 h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                <span className="font-semibold block">Now:</span>
                {article.title.substring(0, 40)}...
              </li>

              <li className="relative">
                <span className="absolute -left-4.25 top-1 h-2.5 w-2.5 rounded-full bg-gray-300"></span>
                <span className="font-semibold text-gray-600 block">Predicted Next:</span>
                Market correction in related mid-caps.
              </li>
            </ul>

          </div>

          {/* related articles */}
          <div className="bg-gray-50 p-4 border border-gray-200 rounded">
            <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500 mb-3">
              Related Articles
            </h2>

            {loadingRelated && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#cc0000]" />
                <p className="text-xs">Loading related articles...</p>
              </div>
            )}

            {relatedArticleList && relatedArticleList.length > 0 && (
              <div className="max-h-48 overflow-y-auto pr-1">
                <ul className="space-y-3">
                  {relatedArticleList.slice(0, 10).map((item, index) => (
                    <li
                      key={index}
                      onClick={() => handleRelatedClick(item.article_id)}
                      className="cursor-pointer hover:text-[#cc0000] transition border-b border-gray-200 pb-2 last:border-none"
                    >
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.date}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty */}
            {relatedArticleList && relatedArticleList.length === 0 && (
              <p className="text-xs text-gray-500">No related articles found.</p>
            )}
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