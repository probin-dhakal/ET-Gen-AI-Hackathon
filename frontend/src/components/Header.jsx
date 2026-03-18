import React, { useEffect, useState } from 'react';
import { Search, TrendingUp, Menu } from 'lucide-react';

const Header = ({ activeLanguage }) => {
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

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentISTDateTime(formatCurrentISTDateTime(new Date()));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <header>
      {/* Utility Bar */}
      <div className="border-b border-gray-200 text-xs py-1 px-4 flex justify-between items-center text-gray-600">
        <div className="flex space-x-4 items-center">
          <span className="font-bold text-gray-800">BENCHMARKS <span className="text-red-600">CLOSED</span></span>
          <span className="flex items-center space-x-1">
            <span>Sensex</span>
            <span className="font-bold text-gray-900">76,704.13</span>
            <span className="text-green-600 flex items-center"><TrendingUp size={12} className="ml-1"/> 633.29</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Stock Quotes, News..." 
              className="pl-8 pr-4 py-1 border border-gray-300 rounded-full text-xs w-64 focus:outline-none focus:border-red-600"
            />
            <Search size={14} className="absolute left-3 top-1.5 text-red-600" />
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
        <Menu className="text-[#cc0000] cursor-pointer" size={24} />
        <span className="text-[#cc0000] cursor-pointer">Home</span>
        <span className="flex items-center cursor-pointer">
          <span className="bg-[#cc0000] text-white text-[10px] px-1 mr-1 rounded-sm">ET</span>Prime
        </span>
        <span className="cursor-pointer hover:text-[#cc0000]">Markets</span>
        <span className="cursor-pointer text-[#cc0000] font-bold border-b-2 border-[#cc0000]">My ET AI</span>
        <span className="cursor-pointer hover:text-[#cc0000]">Industry</span>
        <span className="cursor-pointer hover:text-[#cc0000]">Wealth</span>
        <span className="cursor-pointer hover:text-[#cc0000]">Tech</span>
      </nav>
    </header>
  );
};

export default Header;