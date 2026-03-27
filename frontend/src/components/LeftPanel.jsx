import React, { useState, useEffect } from 'react';
import { Loader, Bookmark, Star } from 'lucide-react';
import axiosInstance from '../lib/axiosinstance';

const LeftPanel = ({ onArticleClick }) => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [breakingArticles, setBreakingArticles] = useState([]);
  const [loadingBreaking, setLoadingBreaking] = useState(true);
  const [mustReadArticles, setMustReadArticles] = useState([]);
  const [loadingMustRead, setLoadingMustRead] = useState(true);

  useEffect(() => {
    const fetchArticlesFromDb = async () => {
      try {
        const response = await axiosInstance.get('/api/feed/latest', {
          params: { limit: 12 }
        });

        const fetchedArticles = response.data?.articles || [];
        const mappedArticles = fetchedArticles.map((item) => ({
          article_id: item.id,
          title: item.heading,
          description: item.nucleus_summary || (item.body || '').slice(0, 240),
          content: item.body || '',
          author: item.author || 'ET Bureau',
          url: item.source_url || '',
          urlToImage: item.image_url || '',
          publishedAt: item.published_at,
          source: {
            name: item.source_name || 'ET Bureau'
          }
        }));

        setArticles(mappedArticles.slice(0, 3));
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchArticlesFromDb();
  }, []);

  useEffect(() => {
    const fetchBreakingNews = async () => {
      try {
        const response = await axiosInstance.get('/api/feed/latest', {
          params: { limit: 5 }
        });

        const fetchedArticles = response.data?.articles || [];
        const mappedArticles = fetchedArticles.map((item) => ({
          article_id: item.id,
          title: item.heading,
          description: item.nucleus_summary || (item.body || '').slice(0, 240),
          content: item.body || '',
          author: item.author || 'ET Bureau',
          url: item.source_url || '',
          urlToImage: item.image_url || '',
          publishedAt: item.published_at,
          source: {
            name: item.source_name || 'ET Bureau'
          }
        }));

        setBreakingArticles(mappedArticles.slice(0, 2));
        setLoadingBreaking(false);
      } catch (err) {
        console.error('Error fetching breaking news:', err);
        setLoadingBreaking(false);
      }
    };

    fetchBreakingNews();
  }, []);

  useEffect(() => {
    const fetchMustReadNews = async () => {
      try {
        const response = await axiosInstance.get('/api/feed/latest', {
          params: { limit: 8 }
        });

        const fetchedArticles = response.data?.articles || [];
        const mappedArticles = fetchedArticles.map((item) => ({
          article_id: item.id,
          title: item.heading,
          description: item.nucleus_summary || (item.body || '').slice(0, 240),
          content: item.body || '',
          author: item.author || 'ET Bureau',
          url: item.source_url || '',
          urlToImage: item.image_url || '',
          publishedAt: item.published_at,
          source: {
            name: item.source_name || 'ET Bureau'
          }
        }));

        setMustReadArticles(mappedArticles.slice(0, 4));
        setLoadingMustRead(false);
      } catch (err) {
        console.error('Error fetching must read news:', err);
        setLoadingMustRead(false);
      }
    };

    fetchMustReadNews();
  }, []);

  const generateAIContext = (index) => {
    const contexts = [
      "AI Note: Competitor X just raised $5M in a down market. Here is how they pitched it compared to your recent deck.",
      "AI Context: You recently searched for GIFT City incorporation rules. This trend might affect your runway projections.",
      "AI Alert: This regulatory change directly impacts the compliance framework you outlined in your Q3 strategy."
    ];
    return contexts[index] || "AI Note: Added to your feed based on your recent market research.";
  };

  const handleArticleClick = (article, index) => {
    if (typeof onArticleClick === 'function') {
      onArticleClick({ ...article, aiContext: generateAIContext(index) });
    }
  };

  return (
    <div className="border-r border-gray-200 pr-4 h-full overflow-y-auto">
      {/* Featured Heading */}
      <div className="mb-6 bg-gradient-to-r from-[#cc0000] to-red-700 text-white p-4 rounded-lg shadow-md">
        <h1 className="font-serif text-2xl font-bold">ET NEWS DIGEST</h1>
        <p className="text-sm text-red-100 mt-1">Your Daily Dose of Markets & Business</p>
      </div>

      {/* Breaking News Section */}
      {loadingBreaking === false && breakingArticles.length > 0 && (
        <div className="mb-6 bg-red-50 p-4 border-l-4 border-[#cc0000] rounded">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-[#cc0000] text-white px-2 py-1 text-xs font-bold rounded">BREAKING</div>
            <h3 className="font-bold text-sm text-[#cc0000]">Breaking News</h3>
          </div>
          <div className="space-y-3">
            {breakingArticles.map((article, index) => (
              <button
                key={index}
                onClick={() => handleArticleClick(article, index)}
                className="w-full text-left p-2 bg-white rounded hover:bg-red-100 transition-colors group"
              >
                <p className="text-xs font-semibold text-gray-600 group-hover:text-[#cc0000]">{article.author}</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-2 mt-1">{article.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Latest News Feed */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-4 w-4 rounded-full bg-[#cc0000] flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
        </div>
        <h2 className="font-bold text-lg">My ET : Latest News Feed</h2>
      </div>
      
      <div className="bg-gray-50 p-4 border border-gray-200 rounded mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-bold">Today's Top Stories</p>
        
        <div className="space-y-6">
          {isLoading && (
            <div className="flex justify-center items-center py-8 text-[#cc0000]">
              <Loader className="animate-spin" size={32} />
              <span className="ml-2 font-bold">Loading news...</span>
            </div>
          )}

          {error && (
            <div className="text-red-600 p-4 border border-red-200 bg-red-50 rounded">
              Unable to load articles from database. Please check backend connectivity.
            </div>
          )}

          {!isLoading && !error && articles.length === 0 && (
            <div className="text-amber-700 p-4 border border-amber-200 bg-amber-50 rounded">
              No articles found in the database yet.
            </div>
          )}

          {!isLoading && !error && articles.length > 0 && articles.map((article, index) => (
            <div 
              key={index} 
              onClick={() => handleArticleClick(article, index)}
              className="flex space-x-4 group cursor-pointer border-b border-gray-200 pb-4 last:border-0 hover:bg-gray-100 p-2 -mx-2 rounded transition-colors"
            >
              <img 
                src={article.urlToImage || `/api/placeholder/100/100?text=ET+News`} 
                alt="News" 
                className="w-24 h-24 object-cover rounded shrink-0"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/api/placeholder/100/100?text=ET+News';
                }}
              />
              <div>
                <h3 className="font-serif font-bold text-lg group-hover:text-[#cc0000] leading-snug">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {article.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Must Read Section */}
      {loadingMustRead === false && mustReadArticles.length > 0 && (
        <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border-l-4 border-blue-600 rounded">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-600 text-white px-2 py-1 text-xs font-bold rounded">EDITOR'S PICK</div>
            <h3 className="font-bold text-sm text-blue-700">Must Read</h3>
          </div>
          <div className="space-y-2">
            {mustReadArticles.map((article, index) => (
              <button
                key={index}
                onClick={() => handleArticleClick(article, index)}
                className="w-full text-left p-2 bg-white rounded hover:bg-blue-100 transition-colors group border border-blue-200 hover:border-blue-400"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-xs font-semibold text-blue-700 group-hover:text-blue-900">{article.author}</p>
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2 mt-0.5 group-hover:text-blue-700">{article.title}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;