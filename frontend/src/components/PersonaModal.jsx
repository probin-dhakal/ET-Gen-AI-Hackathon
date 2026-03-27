import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axiosInstance from '../lib/axiosinstance';
import { useArticleStore } from '../store/useArticle';

const PersonaModal = ({ isOpen, onClose, onArticleClick }) => {
  const { setSelectedPersona } = useArticleStore();
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona_Local] = useState('startup_founder');

  // Fetch available personas
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const response = await axiosInstance.get('/api/personas');
        setPersonas(response.data.personas || []);
        setSelectedPersona_Local(response.data.personas[0]?.id || 'startup_founder');
      } catch (err) {
        console.error('Error fetching personas:', err);
      }
    };

    if (isOpen) {
      fetchPersonas();
    }
  }, [isOpen]);

  const getCurrentPersona = () => {
    return personas.find(p => p.id === selectedPersona);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#cc0000] to-[#ff3333] text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Select Your Profile</h2>
            <p className="text-sm mt-1 opacity-90">Choose a profile to get personalized news</p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-3">Select Profile</label>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona_Local(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#cc0000] focus:outline-none text-gray-900 bg-white"
            >
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50 flex gap-3 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setSelectedPersona(selectedPersona);
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-[#cc0000] hover:bg-[#aa0000] text-white font-bold rounded-lg transition"
          >
            Explore News
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaModal;
