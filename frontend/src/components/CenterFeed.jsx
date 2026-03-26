import React, { useState, useEffect } from 'react';
import { Loader, Users } from 'lucide-react';
import axiosInstance from '../lib/axiosinstance';

const CenterFeed = ({ onArticleClick }) => {
    const handleArticleClick = (article, index) => {
      if (typeof onArticleClick === 'function') {
        onArticleClick({ ...article, aiContext: generateAIContext(index) });
      }
    };

  // Persona-related state
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('startup_founder');
  const [personalizedArticles, setPersonalizedArticles] = useState([]);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState(false);
  const [personalizedError, setPersonalizedError] = useState(null);

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
        const mappedArticles = personalizedData.map((item) => ({
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
          },
          relevance_score: item.persona_relevance_score
        }));

        setPersonalizedArticles(mappedArticles);
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
      <div className="flex items-center space-x-2 mb-4">
        <div className="h-4 w-4 bg-[#cc0000] flex items-center justify-center text-white font-bold text-[10px]">
          <Users size={12} />
        </div>
        <h2 className="font-bold text-lg">Personalized News by Profile</h2>
      </div>

      {/* Persona Selector */}
      <div className="bg-blue-50 p-4 border border-blue-200 rounded mb-6">
        <p className="text-xs text-blue-600 uppercase tracking-wider mb-3 font-bold">Select a User Profile</p>
        <select
          value={selectedPersona}
          onChange={(e) => setSelectedPersona(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded focus:border-[#cc0000] focus:outline-none bg-white text-gray-900 font-medium cursor-pointer hover:border-[#cc0000] transition-colors"
        >
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.role}
            </option>
          ))}
        </select>
        {getCurrentPersona() && (
          <div className="mt-3 p-3 bg-white border border-blue-100 rounded">
            <p className="text-xs text-gray-600 mb-2"><span className="font-semibold">Goal:</span> {getCurrentPersona().goal}</p>
            <p className="text-xs text-indigo-600"><span className="font-semibold">Interests:</span> {getCurrentPersona().interests.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Personalized News Feed */}
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
                  <div className="flex items-start justify-between">
                    <h3 className="font-serif font-bold text-lg group-hover:text-[#cc0000] leading-snug">
                      {article.title}
                    </h3>
                    {article.relevance_score && (
                      <div className="ml-2 px-2 py-1 bg-green-200 text-green-900 text-xs font-bold rounded whitespace-nowrap">
                        {(article.relevance_score * 100).toFixed(0)}% match
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {article.description}
                  </p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default CenterFeed;