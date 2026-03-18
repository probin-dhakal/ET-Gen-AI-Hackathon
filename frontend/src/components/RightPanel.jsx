import React from 'react';
import { Globe, PlayCircle } from 'lucide-react';

const RightPanel = ({ activeLanguage, setActiveLanguage }) => {
  return (
    <div className="h-full">
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
          <option value="Bengali">Bengali (বাংলা)</option>
        </select>
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