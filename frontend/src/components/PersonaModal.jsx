import React, { useState, useEffect } from 'react';
import { X, Loader, Users, ChevronRight } from 'lucide-react';
import axiosInstance from '../lib/axiosinstance';

const PersonaModal = ({ isOpen, onClose, onArticleClick }) => {
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState('startup_founder');
  const [personalizedArticles, setPersonalizedArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch available personas
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const response = await axiosInstance.get('/api/personas');
        setPersonas(response.data.personas || []);
        setSelectedPersona(response.data.personas[0]?.id || 'startup_founder');
      } catch (err) {
        console.error('Error fetching personas:', err);
      }
    };

    if (isOpen) {
      fetchPersonas();
    }
  }, [isOpen]);

  // Fetch personalized news when persona changes
  useEffect(() => {
    const fetchPersonalizedNews = async () => {
      if (!selectedPersona || !isOpen) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(`/api/feed/personalized/${selectedPersona}`, {
          params: { limit: 5 }
        });

        const personalizedData = response.data?.articles || [];
        const mappedArticles = personalizedData.map((item) => ({
          article_id: item.id,
          title: item.heading,
          description: item.nucleus_summary || (item.body || '').slice(0, 150),
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
      } catch (err) {
        console.error('Error fetching personalized articles:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonalizedNews();
  }, [selectedPersona, isOpen]);

  const getCurrentPersona = () => {
    return personas.find(p => p.id === selectedPersona);
  };

  const handleArticleClick = (article) => {
    if (typeof onArticleClick === 'function') {
      onArticleClick(article);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#cc0000] to-[#ff3333] text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Personalized News</h2>
            <p className="text-sm mt-1 opacity-90">Get news tailored to your profile</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Persona Selector */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              👤 Select Your Profile
            </label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-[#cc0000] focus:outline-none bg-white text-gray-900 font-medium cursor-pointer hover:border-[#cc0000] transition-colors"
            >
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.role}
                </option>
              ))}
            </select>

            {/* Persona Info */}
            {getCurrentPersona() && (
              <div className="mt-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-xs text-gray-700 mb-2">
                  <span className="font-semibold text-blue-900">Goal:</span> {getCurrentPersona().goal}
                </p>
                <p className="text-xs text-indigo-700">
                  <span className="font-semibold">Interests:</span> {getCurrentPersona().interests.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Articles Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Users size={16} />
              {getCurrentPersona()?.role} - Recommended News
            </h3>

            {isLoading && (
              <div className="flex justify-center items-center py-8 text-[#cc0000]">
                <Loader className="animate-spin" size={32} />
                <span className="ml-2 font-bold">Curating news for you...</span>
              </div>
            )}

            {error && (
              <div className="text-orange-600 p-4 border border-orange-200 bg-orange-50 rounded">
                Unable to load personalized articles. {error}
              </div>
            )}

            {!isLoading && !error && personalizedArticles.length === 0 && (
              <div className="text-green-700 p-4 border border-green-200 bg-green-50 rounded">
                No personalized articles found for this profile yet.
              </div>
            )}

            {!isLoading && !error && personalizedArticles.length > 0 && (
              <div className="space-y-3">
                {personalizedArticles.map((article, index) => (
                  <div
                    key={index}
                    onClick={() => handleArticleClick(article)}
                    className="cursor-pointer border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-[#cc0000] transition-all group"
                  >
                    <div className="flex gap-3">
                      {article.urlToImage && (
                        <img
                          src={article.urlToImage}
                          alt={article.title}
                          className="w-20 h-20 object-cover rounded group-hover:shadow-md transition "
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#cc0000] line-clamp-2 transition">
                          {article.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {article.description}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-gray-400 group-hover:text-[#cc0000] transition mt-1 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold rounded transition"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-[#cc0000] hover:bg-[#aa0000] text-white font-bold rounded transition"
          >
            Explore News
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaModal;
