import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import axiosInstance from '../lib/axiosinstance';

const LeftPanel = ({ onArticleClick }) => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
                  <span className="font-semibold text-indigo-600">AI Note:</span> {generateAIContext(index)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;