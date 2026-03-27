import React, { useEffect, useState } from 'react';
import { Loader2, ExternalLink, ChevronDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useArticleStore } from '../store/useArticle';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../lib/axiosinstance';
import { fetchImageFromPexels } from '../lib/imageService';

const RightPanel = () => {
  const navigate = useNavigate();
  const { getArticleById } = useArticleStore();
  
  const [allKeywords, setAllKeywords] = useState([]);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [keywordError, setKeywordError] = useState(null);
  const [expandedKeywords, setExpandedKeywords] = useState({});

  // Featured & Slideshows state
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [slideshowArticles, setSlideshowArticles] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  // Stocks state
  const [stocks, setStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  // Helper function to enrich articles with images from Pexels
  const enrichArticlesWithImages = async (articles) => {
    const enriched = articles.map(item => ({
      article_id: item.id,
      title: item.heading,
      description: item.nucleus_summary || (item.body || '').slice(0, 100),
      urlToImage: '', // Will be fetched from Pexels
      author: item.author || 'ET Bureau',
      publishedAt: item.published_at
    }));

    // Fetch images from Pexels for all articles based on title
    for (let i = 0; i < enriched.length; i++) {
      enriched[i].urlToImage = await fetchImageFromPexels(enriched[i].title);
    }

    return enriched;
  };

  // Fetch all keywords with summaries
  useEffect(() => {
    const fetchAllKeywords = async () => {
      try {
        setLoadingKeywords(true);
        setKeywordError(null);
        const response = await axiosInstance.get('/api/keywords');
        setAllKeywords(response.data?.keywords || []);
      } catch (err) {
        console.error('Error fetching keywords:', err);
        setKeywordError('Unable to load keywords');
      } finally {
        setLoadingKeywords(false);
      }
    };

    fetchAllKeywords();
  }, []);

  // Fetch Featured Articles & Slideshows
  useEffect(() => {
    const fetchFeaturedContent = async () => {
      try {
        setLoadingFeatured(true);
        const response = await axiosInstance.get('/api/feed/latest', {
          params: { limit: 10 }
        });

        const articles = response.data?.articles || [];
        const enrichedArticles = await enrichArticlesWithImages(articles);

        setFeaturedArticles(enrichedArticles.slice(0, 2));
        setSlideshowArticles(enrichedArticles.slice(2, 6));
        setLoadingFeatured(false);
      } catch (err) {
        console.error('Error fetching featured content:', err);
        setLoadingFeatured(false);
      }
    };

    fetchFeaturedContent();
  }, []);

  // Fetch Stocks Data
  useEffect(() => {
    const fetchStocksData = async () => {
      try {
        setLoadingStocks(true);
        
        // Mock stock data - can be replaced with real API integration
        // Example APIs: Alpha Vantage, Finnhub, Yahoo Finance
        const mockStocks = [
          { symbol: 'TCS', name: 'Tata Consultancy', price: 3825.50, change: 45.25, changePercent: 1.20 },
          { symbol: 'INFY', name: 'Infosys Limited', price: 1682.30, change: -12.50, changePercent: -0.74 },
          { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2587.65, change: 32.10, changePercent: 1.26 },
          { symbol: 'RELIANCE', name: 'Reliance Industries', price: 3042.80, change: -18.75, changePercent: -0.61 },
          { symbol: 'HDFC', name: 'HDFC Bank', price: 1912.45, change: 67.40, changePercent: 3.65 },
          { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1088.20, change: 23.55, changePercent: 2.21 },
          { symbol: 'WIPRO', name: 'Wipro Limited', price: 425.85, change: 8.30, changePercent: 1.99 },
          { symbol: 'MARUTI', name: 'Maruti Suzuki', price: 12850.75, change: 145.50, changePercent: 1.15 }
        ];
        
        setStocks(mockStocks);
        setLoadingStocks(false);
      } catch (error) {
        console.error('Error fetching stocks:', error);
        setLoadingStocks(false);
      }
    };

    fetchStocksData();
  }, []);

  const toggleKeywordExpand = (keywordId) => {
    setExpandedKeywords(prev => ({
      ...prev,
      [keywordId]: !prev[keywordId]
    }));
  };

  const handleSummaryClick = async (articleId) => {
    try {
      const rawArticle = await getArticleById(articleId);
      if (!rawArticle) return;

      const article = {
        article_id: rawArticle.id,
        title: rawArticle.heading,
        description: rawArticle.nucleus_summary || (rawArticle.body || '').slice(0, 200),
        content: rawArticle.body,
        author: rawArticle.author || 'ET Bureau',
        url: rawArticle.source_url,
        urlToImage: rawArticle.image_url,
        publishedAt: rawArticle.published_at,
        source: {
          name: rawArticle.source_name || 'ET Bureau'
        }
      };

      navigate(`/article/${articleId}`, { state: { article } });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleFeaturedClick = (article) => {
    navigate(`/article/${article.article_id}`, { state: { article } });
  };

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % slideshowArticles.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + slideshowArticles.length) % slideshowArticles.length);
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Trending Keywords */}
      <div className="mb-8">
        <h2 className="font-bold text-sm tracking-wider uppercase text-gray-600 mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#cc0000]" />
          Trending Keywords
        </h2>

        {loadingKeywords ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#cc0000]" />
            <span className="ml-2 text-sm text-gray-600">Loading keywords...</span>
          </div>
        ) : keywordError ? (
          <div className="text-orange-600 p-3 border border-orange-200 bg-orange-50 rounded text-xs">
            {keywordError}
          </div>
        ) : allKeywords.length > 0 ? (
          <div className="space-y-2">
            {allKeywords.slice(0, 10).map((keyword) => (
              <div key={keyword.keyword_id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Keyword Header - Expandable */}
                <button
                  onClick={() => toggleKeywordExpand(keyword.keyword_id)}
                  className="w-full p-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-2 h-2 rounded-full bg-[#cc0000]"></div>
                    <span className="font-semibold text-sm text-gray-900">
                      {keyword.keyword_name}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {keyword.article_count} {keyword.article_count === 1 ? 'article' : 'articles'}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform flex-shrink-0 ${
                      expandedKeywords[keyword.keyword_id] ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Keyword Summaries - Expandable */}
                {expandedKeywords[keyword.keyword_id] && (
                  <div className="p-3 bg-gray-50 space-y-2 max-h-72 overflow-y-auto">
                    {keyword.summaries && keyword.summaries.length > 0 ? (
                      keyword.summaries.map((summary, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSummaryClick(summary.article_id)}
                          className="w-full text-left p-3 bg-white rounded border border-gray-200 hover:border-[#cc0000] hover:bg-red-50 transition-all hover:shadow-sm"
                        >
                          <p className="text-xs text-gray-700 leading-relaxed line-clamp-3 mb-2">
                            {summary.summary || 'No summary available'}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">
                              {new Date(summary.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[#cc0000] text-xs font-semibold flex items-center gap-1">
                              Read <ExternalLink size={12} />
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 py-2">No summaries available</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-4">No keywords found.</p>
        )}
      </div>

      {/* ET Special Section */}
      {!loadingFeatured && featuredArticles.length > 0 && (
        <div className="mb-8">
          <h2 className="font-bold text-sm tracking-wider uppercase text-gray-600 mb-4">ET Special</h2>
          <div className="space-y-3">
            {featuredArticles.map((article, idx) => (
              <button
                key={idx}
                onClick={() => handleFeaturedClick(article)}
                className="w-full group overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="relative h-32 overflow-hidden bg-gray-200">
                  <img
                    src={article.urlToImage || `/api/placeholder/300/150?text=ET`}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/api/placeholder/300/150?text=ET';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h4 className="font-bold text-sm line-clamp-2">{article.title}</h4>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slideshows Section */}
      {!loadingFeatured && slideshowArticles.length > 0 && (
        <div>
          <h2 className="font-bold text-sm tracking-wider uppercase text-gray-600 mb-4">Slideshows</h2>
          <div className="relative">
            <button
              onClick={() => handleFeaturedClick(slideshowArticles[currentSlideIndex])}
              className="w-full group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100 cursor-pointer"
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={slideshowArticles[currentSlideIndex].urlToImage || `/api/placeholder/300/200?text=Slideshow`}
                  alt={slideshowArticles[currentSlideIndex].title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/api/placeholder/300/200?text=Slideshow';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <h4 className="font-bold text-sm line-clamp-2">{slideshowArticles[currentSlideIndex].title}</h4>
                <p className="text-xs text-gray-300 mt-1">{slideshowArticles.length} photos</p>
              </div>
            </button>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#cc0000] text-white p-1.5 rounded-full hover:bg-red-700 transition-colors z-10 group"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#cc0000] text-white p-1.5 rounded-full hover:bg-red-700 transition-colors z-10 group"
            >
              <ChevronRight size={18} />
            </button>

            {/* Slide Indicators */}
            <div className="flex justify-center gap-2 mt-3">
              {slideshowArticles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentSlideIndex ? 'bg-[#cc0000] w-6' : 'bg-gray-300'
                  }`}
                ></button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stocks Section */}
      {!loadingStocks && stocks.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="font-bold text-sm tracking-wider uppercase text-gray-600 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#cc0000]" />
            Top Stocks
          </h2>
          <div className="space-y-2">
            {stocks.map((stock, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors cursor-pointer group"
              >
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-sm text-gray-900 group-hover:text-[#cc0000]">{stock.symbol}</p>
                  <p className="text-xs text-gray-500 truncate">{stock.name}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="font-bold text-sm text-gray-900">₹{stock.price.toFixed(2)}</p>
                  <p className={`text-xs font-semibold flex items-center justify-end gap-1 ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp size={12} className={stock.change < 0 ? 'rotate-180' : ''} />
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;