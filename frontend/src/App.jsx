import React, { useState } from 'react';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import CenterPersonalizedFeed from './components/CenterFeed';
import RightPanel from './components/RightPanel';
import ArticleDetailView from './components/ArticleDetailView';

const App = () => {
  // We keep language state here so the Header and the Vernacular Panel can share it.
  const [activeLanguage, setActiveLanguage] = useState('English');

  const [selectedArticle, setSelectedArticle] = useState(null);

  // Helper function to return to the home screen
  const handleBackToHome = () => {
    setSelectedArticle(null);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-12">
      <Header activeLanguage={activeLanguage} />

      {selectedArticle ? (
        <ArticleDetailView 
          article={selectedArticle} 
          onBack={handleBackToHome}
          activeLanguage={activeLanguage}
          setActiveLanguage={setActiveLanguage}
        />
      ) : (
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-4 mt-4">
        
        {/* Left Column (4 columns wide) */}
        <div className="col-span-1 md:col-span-4">
          <LeftPanel />
        </div>

        {/* Middle Column (5 columns wide) */}
        <div className="col-span-1 md:col-span-5">
          <CenterPersonalizedFeed onArticleClick={setSelectedArticle} />
        </div>

        {/* Right Column (3 columns wide) */}
        <div className="col-span-1 md:col-span-3">
          <RightPanel 
            activeLanguage={activeLanguage} 
            setActiveLanguage={setActiveLanguage}
          />
        </div>
        
      </main>)}
    </div>
  );
};

export default App;