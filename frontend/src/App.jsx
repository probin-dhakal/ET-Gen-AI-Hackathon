import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import CenterPersonalizedFeed from './components/CenterFeed';
import RightPanel from './components/RightPanel';
import ArticleDetailView from './components/ArticleDetailView';
import { useArticleStore } from './store/useArticle';
import Storyarc from './components/Storyarc.jsx';

const HomePage = ({ setActiveLanguage, activeLanguage }) => {

  const { addArticle } = useArticleStore();

  const navigate = useNavigate();

  const handleArticleClick =  (article) => {
    navigate("/article", { state: { article } });
    addArticle(article);
    console.log(article);
  };

  return (
    <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-4 mt-4">
      
      {/* Left Column */}
      <div className="col-span-1 md:col-span-4">
        <LeftPanel />
      </div>

      {/* Middle Column */}
      <div className="col-span-1 md:col-span-5">
        <CenterPersonalizedFeed onArticleClick={handleArticleClick} />
      </div>

      {/* Right Column */}
      <div className="col-span-1 md:col-span-3">
        <RightPanel
          activeLanguage={activeLanguage}
          setActiveLanguage={setActiveLanguage}
        />
      </div>

    </main>
  );
};

const ArticlePage = ({ activeLanguage, setActiveLanguage }) => {

  const navigate = useNavigate();
  const location = useLocation();

  const article = location.state?.article;

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <ArticleDetailView
      article={article}
      onBack={handleBackToHome}
      activeLanguage={activeLanguage}
      setActiveLanguage={setActiveLanguage}
    />
  );
};

const App = () => {

  const [activeLanguage, setActiveLanguage] = useState('English');

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-12">

      <Header activeLanguage={activeLanguage} />

      <Routes>

        <Route
          path="/"
          element={
            <HomePage
              activeLanguage={activeLanguage}
              setActiveLanguage={setActiveLanguage}
            />
          }
        />

        <Route
          path="/article"
          element={
            <ArticlePage
              activeLanguage={activeLanguage}
              setActiveLanguage={setActiveLanguage}
            />
          }
        />

        <Route 
          path="/story" 
          element={<Storyarc />} 
        />

      </Routes>

    </div>
  );
};

export default App;