import React, { useState, useEffect } from 'react';
import { Loader, Users, Settings, ChevronRight } from 'lucide-react';
import axiosInstance from '../lib/axiosinstance';
import { useArticleStore } from '../store/useArticle';
import { fetchImageFromPexels } from '../lib/imageService';

const CenterFeed = ({ onArticleClick, onOpenPersonaModal }) => {
    const { selectedCategory, categoryArticles, loadingCategory, categoryError, selectedPersona } = useArticleStore();
    
    const handleArticleClick = (article, index) => {
      if (typeof onArticleClick === 'function') {
        onArticleClick({ ...article, aiContext: generateAIContext(index) });
      }
    };

  // Persona-related state
  const [personas, setPersonas] = useState([]);
  const [personalizedArticles, setPersonalizedArticles] = useState([]);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);
  const [personalizedError, setPersonalizedError] = useState(null);

  // Top News & Latest News state
  const [newsTab, setNewsTab] = useState('top'); // 'top' or 'latest'
  const [topNewsArticles, setTopNewsArticles] = useState([]);
  const [latestNewsArticles, setLatestNewsArticles] = useState([]);
  const [loadingNewsTab, setLoadingNewsTab] = useState(false);

  // Helper function to enrich articles with images from Pexels
  const enrichArticlesWithImages = async (articles) => {
    const enriched = articles.map(item => ({
      article_id: item.id,
      title: item.heading,
      description: item.nucleus_summary || (item.body || '').slice(0, 240),
      content: item.body || '',
      author: item.author || 'ET Bureau',
      url: item.source_url || '',
      urlToImage: '', // Will be fetched from Pexels
      publishedAt: item.published_at,
      source: {
        name: item.source_name || 'ET Bureau'
      },
      relevance_score: item.persona_relevance_score
    }));

    // Fetch images from Pexels for all articles based on title
    for (let i = 0; i < enriched.length; i++) {
      enriched[i].urlToImage = await fetchImageFromPexels(enriched[i].title);
    }

    return enriched;
  };

  // Fetch available personas
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const response = await axiosInstance.get('/api/personas');
        setPersonas(response.data.personas || []);
      } catch (err) {
        console.error('Error fetching personas:', err);
      }
    };
    
    fetchPersonas();
  }, []);

  // Fetch personalized news when persona changes
  useEffect(() => {
    const fetchPersonalizedNews = async () => {
      if (!selectedPersona) return;
      
      setIsLoadingPersonalized(true);
      setPersonalizedError(null);
      try {
        const response = await axiosInstance.get(`/api/feed/personalized/${selectedPersona}`, {
          params: { limit: 6 }
        });

        const personalizedData = response.data?.articles || [];
        const enrichedArticles = await enrichArticlesWithImages(personalizedData);

        setPersonalizedArticles(enrichedArticles);
        setPersonalizedError(null);
      } catch (err) {
        console.error('Error fetching personalized articles:', err);
        setPersonalizedError(err.message);
      } finally {
        setIsLoadingPersonalized(false);
      }
    };

    fetchPersonalizedNews();
  }, [selectedPersona]);

  // Fetch Top News and Latest News
  useEffect(() => {
    const fetchNewsTabArticles = async () => {
      try {
        setLoadingNewsTab(true);
        
        // Fetch both top and latest news
        const [topRes, latestRes] = await Promise.all([
          axiosInstance.get('/api/feed/latest', { params: { limit: 8 } }),
          axiosInstance.get('/api/feed/latest', { params: { limit: 8 } })
        ]);

        const topEnriched = await enrichArticlesWithImages(topRes.data?.articles || []);
        const latestEnriched = await enrichArticlesWithImages(latestRes.data?.articles || []);

        setTopNewsArticles(topEnriched);
        setLatestNewsArticles(latestEnriched);
        setLoadingNewsTab(false);
      } catch (err) {
        console.error('Error fetching news tab articles:', err);
        setLoadingNewsTab(false);
      }
    };

    fetchNewsTabArticles();
  }, []);

  const generateAIContext = (index) => {
    const contexts = [
      "AI Note: Competitor X just raised $5M in a down market. Here is how they pitched it compared to your recent deck.",
      "AI Context: You recently searched for GIFT City incorporation rules. This trend might affect your runway projections.",
      "AI Alert: This regulatory change directly impacts the compliance framework you outlined in your Q3 strategy."
    ];
    return contexts[index] || "AI Note: Added to your feed based on your recent market research.";
  };

  const getCurrentPersona = () => {
    return personas.find(p => p.id === selectedPersona);
  };

  return (
    <div className="border-r border-gray-200 pr-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-[#cc0000] flex items-center justify-center text-white font-bold text-[10px]">
            <Users size={12} />
          </div>
          <h2 className="font-bold text-lg">
            {selectedCategory 
              ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} News` 
              : 'Personalized News by Profile'}
          </h2>
        </div>
        {!selectedCategory && (
          <button
            onClick={onOpenPersonaModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-[#cc0000]"
            title="Change profile"
          >
            <Settings size={18} />
          </button>
        )}
      </div>

      {/* Category News Feed */}
      {selectedCategory && (
        <div className="bg-blue-50 p-4 border border-blue-200 rounded mb-6">
          <p className="text-xs text-blue-700 uppercase tracking-wider mb-4 font-bold">
            {selectedCategory.toUpperCase()} - Latest Stories
          </p>

          <div className="space-y-6">
            {loadingCategory && (
              <div className="flex justify-center items-center py-8 text-[#cc0000]">
                <Loader className="animate-spin" size={32} />
                <span className="ml-2 font-bold">Loading {selectedCategory} news...</span>
              </div>
            )}

            {categoryError && (
              <div className="text-orange-600 p-4 border border-orange-200 bg-orange-50 rounded">
                Unable to load {selectedCategory} articles. {categoryError}
              </div>
            )}

            {!loadingCategory && !categoryError && categoryArticles.length === 0 && (
              <div className="text-blue-700 p-4 border border-blue-200 bg-blue-50 rounded">
                No articles found in {selectedCategory} category.
              </div>
            )}

            {!loadingCategory && !categoryError && categoryArticles.length > 0 && 
              categoryArticles.map((article, index) => (
                <div 
                  key={index} 
                  onClick={() => handleArticleClick(article, index)}
                  className="flex space-x-4 group cursor-pointer border-b border-blue-200 pb-4 last:border-0 hover:bg-blue-100 p-2 -mx-2 rounded transition-colors"
                >
                  <img 
                    src={article.urlToImage || `/api/placeholder/100/100?text=${selectedCategory}`} 
                    alt="News" 
                    className="w-24 h-24 object-cover rounded shrink-0"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = `/api/placeholder/100/100?text=${selectedCategory}`;
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-serif font-bold text-lg group-hover:text-[#cc0000] leading-snug">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                      {article.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {article.author} • {new Date(article.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Personalized News Feed - Only show when no category selected */}
      {!selectedCategory && (
      <div className="bg-green-50 p-4 border border-green-200 rounded mb-6">
        <p className="text-xs text-green-700 uppercase tracking-wider mb-4 font-bold">
          {getCurrentPersona()?.role} - Tailored News
        </p>

        <div className="space-y-6">
          {isLoadingPersonalized && (
            <div className="flex justify-center items-center py-8 text-[#cc0000]">
              <Loader className="animate-spin" size={32} />
              <span className="ml-2 font-bold">Curating personalized news...</span>
            </div>
          )}

          {personalizedError && (
            <div className="text-orange-600 p-4 border border-orange-200 bg-orange-50 rounded">
              Unable to load personalized articles. {personalizedError}
            </div>
          )}

          {!isLoadingPersonalized && !personalizedError && personalizedArticles.length === 0 && (
            <div className="text-green-700 p-4 border border-green-200 bg-green-50 rounded">
              No personalized articles found for this profile yet.
            </div>
          )}

          {!isLoadingPersonalized && !personalizedError && personalizedArticles.length > 0 && 
            personalizedArticles.map((article, index) => (
              <div 
                key={index} 
                onClick={() => handleArticleClick(article, index)}
                className="flex space-x-4 group cursor-pointer border-b border-green-200 pb-4 last:border-0 hover:bg-green-100 p-2 -mx-2 rounded transition-colors"
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
                <div className="flex-1">
                  <h3 className="font-serif font-bold text-lg group-hover:text-[#cc0000] leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {article.description}
                  </p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
      )}

      {/* TOP NEWS / LATEST NEWS Section */}
      <div className="mt-8 mb-6">
        <div className="flex gap-2 mb-4 border-b-2 border-gray-200">
          <button
            onClick={() => setNewsTab('top')}
            className={`px-4 py-2 font-semibold transition-all ${
              newsTab === 'top'
                ? 'text-[#cc0000] border-b-2 border-[#cc0000] -mb-0.5'
                : 'text-gray-600 hover:text-[#cc0000]'
            }`}
          >
            TOP NEWS
          </button>
          <button
            onClick={() => setNewsTab('latest')}
            className={`px-4 py-2 font-semibold transition-all ${
              newsTab === 'latest'
                ? 'text-[#cc0000] border-b-2 border-[#cc0000] -mb-0.5'
                : 'text-gray-600 hover:text-[#cc0000]'
            }`}
          >
            LATEST NEWS
          </button>
        </div>

        {loadingNewsTab ? (
          <div className="flex justify-center items-center py-8 text-[#cc0000]">
            <Loader className="animate-spin" size={24} />
            <span className="ml-2 font-semibold">Loading... </span>
          </div>
        ) : (
          <div className="space-y-4">
            {(newsTab === 'top' ? topNewsArticles : latestNewsArticles)
              .slice(0, 4)
              .map((article, index) => (
                <button
                  key={index}
                  onClick={() => handleArticleClick(article, index)}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all group flex items-start gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#cc0000] font-bold text-xs">{index + 1}</span>
                      <span className="text-gray-500 text-xs">{article.author}</span>
                    </div>
                    <h4 className="font-semibold text-sm text-gray-900 group-hover:text-[#cc0000] line-clamp-2 mb-1">
                      {article.title}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-1">{article.description}</p>
                  </div>
                  <img
                    src={article.urlToImage || `/api/placeholder/60/60?text=News`}
                    alt="thumbnail"
                    className="w-16 h-16 object-cover rounded shrink-0"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/api/placeholder/60/60?text=News';
                    }}
                  />
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterFeed;