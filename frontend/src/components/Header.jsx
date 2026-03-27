import React, { useEffect, useState } from 'react';
import { Search, TrendingUp, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../lib/axiosinstance';
import { useArticleStore } from '../store/useArticle';

const Header = ({ activeLanguage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getArticleById, setArticleId, addArticle, getCategoryArticles, selectedCategory } = useArticleStore();
  const [activeNav, setActiveNav] = useState('home');
  const [sensex, setSensex] = useState({ value: 76704.13, change: 633.29 });
  const [nifty, setNifty] = useState({ value: 23286.45, change: 195.75 });

  const formatCurrentISTDateTime = (date) => {
    const day = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(date);

    const month = new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      timeZone: 'Asia/Kolkata',
    }).format(date);

    const year = new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(date);

    const time = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(date);

    return `${day} ${month}, ${year}, ${time} IST`;
  };

  const [currentISTDateTime, setCurrentISTDateTime] = useState(formatCurrentISTDateTime(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Fetch market indices data
  const fetchMarketIndices = async () => {
    try {
      // Using realistic mock data - can be replaced with real API
      // Example APIs: Alpha Vantage, Finnhub, Yahoo Finance
      const mockData = {
        sensex: { value: 76704.13 + Math.random() * 1000, change: 633.29 + (Math.random() - 0.5) * 200 },
        nifty: { value: 23286.45 + Math.random() * 300, change: 195.75 + (Math.random() - 0.5) * 100 }
      };
      
      setSensex({
        value: parseFloat(mockData.sensex.value.toFixed(2)),
        change: parseFloat(mockData.sensex.change.toFixed(2))
      });
      setNifty({
        value: parseFloat(mockData.nifty.value.toFixed(2)),
        change: parseFloat(mockData.nifty.change.toFixed(2))
      });
    } catch (error) {
      console.error('Error fetching market indices:', error);
    }
  };

  const mapDbArticleToCard = (dbArticle, aiContext = null) => ({
    article_id: dbArticle.id,
    title: dbArticle.heading,
    description: dbArticle.nucleus_summary || (dbArticle.body || '').slice(0, 240),
    content: dbArticle.body || '',
    author: dbArticle.author || 'ET Bureau',
    url: dbArticle.source_url || '',
    urlToImage: dbArticle.image_url || '',
    publishedAt: dbArticle.published_at,
    source: {
      name: dbArticle.source_name || 'ET Bureau'
    },
    aiContext
  });

  const normalizeSearchResponse = (payload) => {
    if (Array.isArray(payload?.articles)) {
      return payload.articles.map((item) => ({
        article_id: item.id || item.article_id,
        title: item.heading || item.title || 'Untitled article',
        description: item.nucleus_summary || (item.body || '').slice(0, 200),
        meta: item.source_name || item.category || 'Article'
      })).filter((item) => item.article_id);
    }

    const keyword = payload?.keyword;
    if (keyword) {
      const results = [];

      if (keyword.source_article_id) {
        results.push({
          article_id: keyword.source_article_id,
          title: keyword.source_heading || 'Source article',
          description: keyword.source_description || '',
          meta: 'Source Article'
        });
      }

      if (Array.isArray(keyword.related_articles)) {
        keyword.related_articles.forEach((item) => {
          if (!item?.article_id) return;
          results.push({
            article_id: item.article_id,
            title: item.title || 'Related article',
            description: item.summary || '',
            meta: 'Related Article'
          });
        });
      }

      const seen = new Set();
      return results.filter((item) => {
        if (seen.has(item.article_id)) return false;
        seen.add(item.article_id);
        return true;
      });
    }

    return [];
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError('');

      const response = await axiosInstance.get(`/api/articles/search/${encodeURIComponent(query)}`);
      const normalized = normalizeSearchResponse(response.data);

      setSearchResults(normalized);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Unable to search articles right now.');
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchResultClick = async (result) => {
    try {
      let nextArticle = result;

      if (result.article_id) {
        const dbArticle = await getArticleById(result.article_id);
        if (dbArticle) {
          nextArticle = mapDbArticleToCard(dbArticle);
        }
      }

      if (nextArticle.article_id) {
        setArticleId(nextArticle.article_id);
        navigate(`/article/${nextArticle.article_id}`, { state: { article: nextArticle } });
      } else {
        navigate('/article', { state: { article: nextArticle } });
        addArticle(nextArticle);
      }

      setShowResults(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to open search result article:', error);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentISTDateTime(formatCurrentISTDateTime(new Date()));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Fetch market indices on mount and refresh every 30 seconds
  useEffect(() => {
    fetchMarketIndices();
    const marketIntervalId = setInterval(fetchMarketIndices, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(marketIntervalId);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() !== '') return;
    setSearchResults([]);
    setSearchError('');
    setShowResults(false);
  }, [searchQuery]);

  // Update active nav based on current route
  useEffect(() => {
    if (location.pathname === '/') {
      setActiveNav('home');
    } else if (location.pathname.includes('/article')) {
      setActiveNav('myetai');
    }
  }, [location]);

  const handleNavClick = (navItem) => {
    setActiveNav(navItem);
    navigate('/');
    
    switch (navItem) {
      case 'home':
        getCategoryArticles(null); // Clear category on home
        break;
      case 'myetai':
        getCategoryArticles(null); // Clear category to show personalized feed
        break;
      case 'world':
        getCategoryArticles('world');
        break;
      case 'india':
        getCategoryArticles('india');
        break;
      case 'technology':
        getCategoryArticles('technology');
        break;
      case 'business':
        getCategoryArticles('business');
        break;
      case 'health':
        getCategoryArticles('health');
        break;
      case 'education':
        getCategoryArticles('education');
        break;
      default:
        break;
    }
  };

  return (
    <header>
      {/* Utility Bar */}
      <div className="border-b border-gray-200 text-xs py-1 px-4 flex justify-between items-center text-gray-600">
        <div className="flex space-x-6 items-center">
          <span className="font-bold text-gray-800">BENCHMARKS <span className="text-red-600">CLOSED</span></span>
          <span className="flex items-center space-x-1">
            <span>Sensex</span>
            <span className="font-bold text-gray-900">{sensex.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            <span className={`flex items-center ${sensex.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp size={12} className="ml-1"/> 
              {sensex.change >= 0 ? '+' : ''}{sensex.change.toFixed(2)}
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span>Nifty</span>
            <span className="font-bold text-gray-900">{nifty.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            <span className={`flex items-center ${nifty.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp size={12} className="ml-1"/> 
              {nifty.change >= 0 ? '+' : ''}{nifty.change.toFixed(2)}
            </span>
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSearch();
                }
              }}
              onFocus={() => {
                if (searchResults.length || searchError) {
                  setShowResults(true);
                }
              }}
              placeholder="Search Stock Quotes, News..." 
              className="pl-8 pr-4 py-1 border border-gray-300 rounded-full text-xs w-64 focus:outline-none focus:border-red-600"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="absolute left-3 top-1.5 text-red-600"
              aria-label="Search articles"
            >
              <Search size={14} />
            </button>

            {showResults && (searchLoading || searchError || searchResults.length > 0) && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                {searchLoading && (
                  <div className="px-3 py-2 text-xs text-gray-600">Searching...</div>
                )}

                {!searchLoading && searchError && (
                  <div className="px-3 py-2 text-xs text-red-600">{searchError}</div>
                )}

                {!searchLoading && !searchError && searchResults.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-500">No results found.</div>
                )}

                {!searchLoading && !searchError && searchResults.map((item) => (
                  <button
                    key={item.article_id}
                    type="button"
                    onClick={() => handleSearchResultClick(item)}
                    className="w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <p className="text-xs font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                    <p className="text-[10px] text-red-600 mt-1">{item.meta}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="border border-gray-800 px-2 py-0.5 rounded text-gray-800 hover:bg-gray-100">Sign In</button>
        </div>
      </div>

      {/* Main Branding */}
      <div className="py-6 flex flex-col items-center border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="bg-[#cc0000] text-white font-serif font-bold text-3xl px-2 py-0.5 tracking-tighter">ET</div>
          <h1 className="font-serif text-5xl font-bold tracking-tight text-gray-900">THE ECONOMIC TIMES</h1>
        </div>
        <div className="text-sm text-gray-500 mt-2 flex items-center space-x-2">
          <span>{activeLanguage} Edition ▾</span><span>|</span>
          <span>{currentISTDateTime}</span><span>|</span>
          <span className="font-bold text-black">Today's ePaper</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="border-b-2 border-[#cc0000] sticky top-0 bg-red-50 z-10 flex items-center px-4 py-2 space-x-4 text-sm font-medium">
        <Menu 
          className="text-[#cc0000] cursor-pointer hover:opacity-70 transition" 
          size={24}
          onClick={() => alert('Menu coming soon')}
        />
        <span 
          onClick={() => handleNavClick('home')}
          className={`cursor-pointer transition-colors ${activeNav === 'home' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          Home
        </span>
        <span 
          onClick={() => handleNavClick('world')}
          className={`cursor-pointer transition-colors ${activeNav === 'world' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          World
        </span>
        <span 
          onClick={() => handleNavClick('india')}
          className={`cursor-pointer transition-colors ${activeNav === 'india' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          India
        </span>
        <span 
          onClick={() => handleNavClick('technology')}
          className={`cursor-pointer transition-colors ${activeNav === 'technology' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          Technology
        </span>
        <span 
          onClick={() => handleNavClick('business')}
          className={`cursor-pointer transition-colors ${activeNav === 'business' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          Business
        </span>
        <span 
          onClick={() => handleNavClick('health')}
          className={`cursor-pointer transition-colors ${activeNav === 'health' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          Health
        </span>
        <span 
          onClick={() => handleNavClick('education')}
          className={`cursor-pointer transition-colors ${activeNav === 'education' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          Education
        </span>
        <span className="text-gray-300">|</span>
        <span 
          onClick={() => handleNavClick('myetai')}
          className={`cursor-pointer font-bold transition-colors ${activeNav === 'myetai' ? 'text-[#cc0000] border-b-2 border-[#cc0000]' : 'hover:text-[#cc0000]'}`}
        >
          My ET AI
        </span>
      </nav>
    </header>
  );
};

export default Header;