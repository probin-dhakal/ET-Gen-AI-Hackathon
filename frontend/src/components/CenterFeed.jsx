import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader } from 'lucide-react';

const CenterFeed = ({ onArticleClick }) => {
    const handleArticleClick = (article, index) => {
      if (typeof onArticleClick === 'function') {
        onArticleClick({ ...article, aiContext: generateAIContext(index) });
      }
    };

  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const API_KEY = import.meta.env.VITE_NEWS_API_KEY; 

    const topHeadlinesUrl = `https://newsapi.org/v2/top-headlines?country=in&category=business&pageSize=3&apiKey=${API_KEY}`;
    const fallbackUrl = `https://newsapi.org/v2/everything?q=india%20business&language=en&sortBy=publishedAt&pageSize=3&apiKey=${API_KEY}`;

    const fetchNews = async () => {
      try {
        const topHeadlinesResponse = await fetch(topHeadlinesUrl);
        if (!topHeadlinesResponse.ok) throw new Error('Failed to fetch news');

        const topHeadlinesData = await topHeadlinesResponse.json();
        let fetchedArticles = topHeadlinesData.articles || [];

        // Fallback to a broader query when top headlines are temporarily empty.
        if (fetchedArticles.length === 0) {
          const fallbackResponse = await fetch(fallbackUrl);
          if (!fallbackResponse.ok) throw new Error('Failed to fetch fallback news');

          const fallbackData = await fallbackResponse.json();
          fetchedArticles = fallbackData.articles || [];
        }

        setArticles(fetchedArticles.slice(0, 3));
        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  const generateAIContext = (index) => {
    const contexts = [
      "AI Note: Competitor X just raised $5M in a down market. Here is how they pitched it compared to your recent deck.",
      "AI Context: You recently searched for GIFT City incorporation rules. This trend might affect your runway projections.",
      "AI Alert: This regulatory change directly impacts the compliance framework you outlined in your Q3 strategy."
    ];
    return contexts[index] || "AI Note: Added to your feed based on your recent market research.";
  };

  return (
    <div className="border-r border-gray-200 pr-4 h-full">
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-4 w-4 rounded-full bg-[#cc0000] flex items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
        </div>
        <h2 className="font-bold text-lg">My ET : The Personalized Newsroom</h2>
      </div>
      
      <div className="bg-gray-50 p-4 border border-gray-200 rounded mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-bold">Generated for: Startup Founder Profile</p>
        
        <div className="space-y-6">
          {isLoading && (
            <div className="flex justify-center items-center py-8 text-[#cc0000]">
              <Loader className="animate-spin" size={32} />
              <span className="ml-2 font-bold">Curating your AI feed...</span>
            </div>
          )}

          {error && (
            <div className="text-red-600 p-4 border border-red-200 bg-red-50 rounded">
              Unable to load live news feed. Please check your API key.
            </div>
          )}

          {!isLoading && !error && articles.length === 0 && (
            <div className="text-amber-700 p-4 border border-amber-200 bg-amber-50 rounded">
              No fresh business headlines are available right now. Please check back shortly.
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

      {/* AI Investment Ideas */}
      <div className="flex items-center space-x-2 mb-4 mt-8">
        <div className="h-4 w-4 bg-[#cc0000] flex items-center justify-center text-white font-bold text-[10px]">P</div>
        <h2 className="font-bold text-lg">Investment Ideas Generated by AI</h2>
      </div>
      <ul className="space-y-4 font-serif text-[17px]">
        <li className="flex items-start">
          <ChevronRight className="text-[#cc0000] mt-1 mr-1 shrink-0" size={16} />
          <span>For a long-term perspective: 5 mid-cap stocks analyzed against your current portfolio risk threshold.</span>
        </li>
      </ul>
    </div>
  );
};

export default CenterFeed;