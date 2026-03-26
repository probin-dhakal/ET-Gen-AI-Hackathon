import React, { useEffect } from 'react';
import { Globe, PlayCircle, Loader2, ExternalLink } from 'lucide-react';
import { useArticleStore } from '../store/useArticle';
import { useNavigate } from 'react-router-dom';

const RightPanel = ({ activeLanguage, setActiveLanguage }) => {
  const navigate = useNavigate();
  const { getRelatedArticles, relatedArticles, loadingRelated, getArticleById, keywordData, article_id } = useArticleStore();

  useEffect(() => {
    // Fetch related articles when component mounts or when article_id changes
    if (article_id) {
      getRelatedArticles();
    }
  }, [article_id, getRelatedArticles]);

  const handleRelatedArticleClick = async (article_id) => {
    try {
      const rawArticle = await getArticleById(article_id);
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
          <option value="Assamese">Assamese (অসমীয়া)</option>
        </select>
      </div>

      {/* Source Article Info */}
      {keywordData && (keywordData.source_heading || keywordData.source_description) && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-bold text-sm tracking-wider uppercase text-gray-600 mb-3 flex items-center">
            📋 This Article Topics
          </h2>
          <div>
            <p className="font-semibold text-sm text-gray-900 mb-2 line-clamp-2">
              {keywordData.source_heading}
            </p>
            {keywordData.source_description && (
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-3 mb-3">
                {keywordData.source_description}
              </p>
            )}
            {keywordData.keywords && keywordData.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {keywordData.keywords.slice(0, 3).map((keyword, idx) => (
                  <span key={idx} className="bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded">
                    {keyword}
                  </span>
                ))}
                {keywordData.keywords.length > 3 && (
                  <span className="text-xs text-gray-600 px-2 py-1">+{keywordData.keywords.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Articles */}
      <div className="mb-8">
        <h2 className="font-bold text-sm tracking-wider uppercase text-gray-600 mb-4 flex items-center">
          📰 Related Articles
        </h2>
        
        {loadingRelated ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#cc0000]" />
            <span className="ml-2 text-sm text-gray-600">Loading related articles...</span>
          </div>
        ) : relatedArticles && relatedArticles.length > 0 ? (
          <div className="space-y-3">
            {relatedArticles.map((article) => (
              <div
                key={article.article_id}
                onClick={() => handleRelatedArticleClick(article.article_id)}
                className="p-3 bg-gray-50 border border-gray-200 rounded hover:border-[#cc0000] hover:bg-red-50 transition-all cursor-pointer group"
              >
                {/* Article Title */}
                <p className="font-semibold text-sm text-gray-900 group-hover:text-[#cc0000] line-clamp-2 mb-2">
                  {article.title}
                </p>
                
                {/* Article Summary/Description */}
                <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                  {article.summary}
                </p>
                
                {/* Meta Info: Shared Keywords + Date */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {article.shared_keywords} shared keyword{article.shared_keywords !== 1 ? 's' : ''}
                  </span>
                  <span>{new Date(article.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-4">No related articles found.</p>
        )}
      </div>

      {/* AI Video Studio */}
      <div>
        <h2 className="font-bold text-2xl mb-4 border-b-2 border-black pb-1">AI Video Studio</h2>
        <div className="relative group cursor-pointer">
          <img src="/api/placeholder/300/180" alt="Video" className="w-full rounded" />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center group-hover:bg-opacity-50 transition-all rounded">
            <PlayCircle size={48} className="text-white opacity-80 group-hover:opacity-100" />
          </div>
          <div className="absolute bottom-2 left-2 bg-[#cc0000] text-white text-xs font-bold px-2 py-1 rounded">
            AI Auto-Generated
          </div>
        </div>
        <p className="font-serif font-bold text-lg mt-2 leading-snug hover:text-[#cc0000] cursor-pointer">
          60-Second Brief: Glenmark Pharma breaks out. What should investors do?
        </p>
        <p className="text-xs text-gray-500 mt-1">Generated from text article in 4 seconds.</p>
      </div>
    </div>
  );
};

export default RightPanel;