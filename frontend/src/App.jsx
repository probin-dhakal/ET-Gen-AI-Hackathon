import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import CenterPersonalizedFeed from './components/CenterFeed';
import RightPanel from './components/RightPanel';
import ArticleDetailView from './components/ArticleDetailView';
import Footer from './components/Footer';
import PersonaModal from './components/PersonaModal';
import { useArticleStore } from './store/useArticle';
import Storyarc from './components/Storyarc.jsx';

const HomePage = ({ setActiveLanguage, activeLanguage }) => {

  const { addArticle, setArticleId, getArticleById } = useArticleStore();

  const navigate = useNavigate();

  // Manage persona modal state for first-time visitors
  const [showPersonaModal, setShowPersonaModal] = useState(false);

  useEffect(() => {
    // Check if user has seen the persona modal before
    const hasSeenPersonaModal = localStorage.getItem('hasSeenPersonaModal');
    if (!hasSeenPersonaModal) {
      setShowPersonaModal(true);
      localStorage.setItem('hasSeenPersonaModal', 'true');
    }
  }, []);

  const handleArticleClick = async (article) => {
    let nextArticle = article;

    if (article.article_id) {
      try {
        const dbArticle = await getArticleById(article.article_id);
        if (dbArticle) {
          nextArticle = {
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
            aiContext: article.aiContext
          };
        }
      } catch (error) {
        console.error('Failed to fetch article by ID:', error);
      }
    }

    const routeArticleId = nextArticle.article_id;
    if (routeArticleId) {
      navigate(`/article/${routeArticleId}`, { state: { article: nextArticle } });
    } else {
      navigate("/article", { state: { article: nextArticle } });
    }

    if (nextArticle.article_id) {
      setArticleId(nextArticle.article_id);
    } else {
      addArticle(nextArticle);
    }

    console.log(nextArticle);
  };

  return (
    <>
      <PersonaModal 
        isOpen={showPersonaModal} 
        onClose={() => setShowPersonaModal(false)}
        onArticleClick={handleArticleClick}
      />
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 p-4 mt-4">
        
        {/* Left Column */}
        <div className="col-span-1 md:col-span-4">
          <LeftPanel onArticleClick={handleArticleClick} />
        </div>

        {/* Middle Column */}
        <div className="col-span-1 md:col-span-5">
          <CenterPersonalizedFeed 
            onArticleClick={handleArticleClick}
            onOpenPersonaModal={() => setShowPersonaModal(true)}
          />
        </div>

        {/* Right Column */}
        <div className="col-span-1 md:col-span-3">
          <RightPanel
            activeLanguage={activeLanguage}
            setActiveLanguage={setActiveLanguage}
          />
        </div>

      </main>
    </>
  );
};

const ArticlePage = ({ activeLanguage, setActiveLanguage }) => {

  const navigate = useNavigate();
  const location = useLocation();
  const { articleId } = useParams();
  const { getArticleById, setArticleId } = useArticleStore();

  const [routeArticle, setRouteArticle] = useState(location.state?.article || null);

  useEffect(() => {
    let isMounted = true;

    const loadArticleFromRoute = async () => {
      if (!articleId) {
        return;
      }

      try {
        const id = Number(articleId);
        if (!Number.isFinite(id)) {
          return;
        }

        const rawArticle = await getArticleById(id);
        if (!rawArticle || !isMounted) {
          return;
        }

        const mapped = {
          article_id: rawArticle.id,
          title: rawArticle.heading,
          description: rawArticle.nucleus_summary || (rawArticle.body || '').slice(0, 240),
          content: rawArticle.body || '',
          author: rawArticle.author || 'ET Bureau',
          url: rawArticle.source_url || '',
          urlToImage: rawArticle.image_url || '',
          publishedAt: rawArticle.published_at,
          source: {
            name: rawArticle.source_name || 'ET Bureau'
          }
        };

        setRouteArticle(mapped);
        setArticleId(id);
      } catch (error) {
        console.error('Failed to load route article:', error);
      }
    };

    loadArticleFromRoute();

    return () => {
      isMounted = false;
    };
  }, [articleId, getArticleById, setArticleId]);

  const article = routeArticle || location.state?.article;

  const handleBackToHome = () => {
    navigate("/");
  };

  if (!article) {
    return <div className="max-w-7xl mx-auto p-4 mt-4 text-gray-600">Loading article...</div>;
  }

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
          path="/article/:articleId"
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

      <Footer />

    </div>
  );
};

export default App;