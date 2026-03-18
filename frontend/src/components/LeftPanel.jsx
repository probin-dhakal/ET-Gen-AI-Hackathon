import React from 'react';
import { Activity, MessageSquare } from 'lucide-react';

const LeftPanel = () => {
  return (
    <div className="border-r border-gray-200 pr-4 h-full">
      {/* Story Arc Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-3">
          <Activity size={18} className="text-[#cc0000]" />
          <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">Story Arc Tracker</h2>
        </div>
        <img src="/api/placeholder/400/200" alt="War Tracker" className="w-full mb-3 object-cover rounded" />
        <h1 className="font-serif text-3xl font-bold leading-tight mb-2 hover:text-[#cc0000] cursor-pointer">
          Mosaic Defence: An Iranian war mirage that keeps its fight alive
        </h1>
        
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 my-4 text-sm">
          <p className="font-bold text-blue-800 mb-2">AI Generated Arc Prediction:</p>
          <ul className="space-y-2 border-l-2 border-blue-300 ml-2 pl-3">
            <li className="relative">
              <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white"></span>
              <span className="font-semibold">Current:</span> Israel pounds Lebanon; blasts in Dubai
            </li>
            <li className="relative">
              <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-gray-300 border-2 border-white"></span>
              <span className="font-semibold text-gray-600">Likely Next:</span> Brent crude spikes to $95/bbl
            </li>
            <li className="relative">
              <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-gray-300 border-2 border-white"></span>
              <span className="font-semibold text-gray-600">Watch For:</span> RBI emergency rate meeting
            </li>
          </ul>
        </div>
      </div>

      <hr className="my-6 border-gray-200" />

      {/* News Navigator Section */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <MessageSquare size={18} className="text-[#cc0000]" />
          <h2 className="font-bold text-sm tracking-wider uppercase text-gray-500">News Navigator (Interact)</h2>
        </div>
        <div className="space-y-3 font-serif text-lg">
          <p className="border-b border-gray-200 pb-2 cursor-pointer hover:text-[#cc0000] transition-colors">
            Ask AI: How does China's miss benefit Indian Russian tanker U-turns?
          </p>
          <p className="border-b border-gray-200 pb-2 cursor-pointer hover:text-[#cc0000] transition-colors">
            Summarize: Steps suggested to ease 'worrying' LPG crisis
          </p>
          <p className="pb-2 cursor-pointer hover:text-[#cc0000] transition-colors">
            Deep Dive: War-led energy woes take Indian rupee to new low
          </p>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;