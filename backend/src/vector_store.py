"""
FAISS Vector Store Integration for News Navigator.
Handles semantic search via embeddings using Sentence Transformers.
Links FAISS indices back to Postgres article IDs.
"""

import os
import pickle
import json
import numpy as np
from typing import List, Tuple, Optional
from pathlib import Path

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False


class VectorStore:
    """
    Local FAISS index for semantic search using Sentence Transformers.
    Maps vector indices back to database article IDs.
    """
    
    def __init__(self, store_dir: str = "db/news_navigator_vectors", model_name: str = "all-MiniLM-L6-v2"):
        """Initialize vector store with local directory."""
        self.store_dir = Path(store_dir)
        self.store_dir.mkdir(parents=True, exist_ok=True)
        
        self.index_path = self.store_dir / "faiss_index.bin"
        self.id_map_path = self.store_dir / "id_map.json"
        
        # Initialize Sentence Transformer embeddings
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError("Sentence Transformers not installed. Run: pip install sentence-transformers")
        
        try:
            self.embeddings = SentenceTransformer(model_name)
            self.dimension = self.embeddings.get_sentence_embedding_dimension()
            self.embeddings_available = True
        except Exception as e:
            print(f"⚠️ Embeddings initialization warning: {e}")
            print("  Continuing without semantic search capabilities...")
            self.embeddings_available = False
            self.dimension = 384  # Default for all-MiniLM-L6-v2
        
        # Load or create index
        self.index = self._load_or_create_index()
        self.id_map = self._load_id_map()
    
    def _load_or_create_index(self) -> 'faiss.IndexFlatL2':
        """Load existing FAISS index or create new one."""
        if not FAISS_AVAILABLE:
            raise ImportError("FAISS not installed. Run: pip install faiss-cpu")
        
        if self.index_path.exists():
            return faiss.read_index(str(self.index_path))
        
        # Create L2 index (Euclidean distance)
        index = faiss.IndexFlatL2(self.dimension)
        return index
    
    def _load_id_map(self) -> dict:
        """Load article ID mappings."""
        if self.id_map_path.exists():
            with open(self.id_map_path, 'r') as f:
                data = json.load(f)
                # Convert string keys back to ints
                return {int(k): v for k, v in data.items()}
        return {}
    
    def _save_id_map(self) -> None:
        """Persist ID mappings to disk."""
        with open(self.id_map_path, 'w') as f:
            json.dump(self.id_map, f)
    
    def add_article(
        self,
        article_id: int,
        nucleus_summary: str
    ) -> int:
        """
        Add article embedding to FAISS index.
        
        Args:
            article_id: Database article ID
            nucleus_summary: Article nucleus summary text
        
        Returns:
            FAISS index position
        """
        try:
            if not self.embeddings_available or not FAISS_AVAILABLE:
                # Create a placeholder index mapping even without embeddings
                faiss_index = article_id  # Use article_id as fallback
                self.id_map[faiss_index] = article_id
                self._save_id_map()
                return faiss_index
            
            # Generate embedding using Sentence Transformer
            embedding = self.embeddings.encode(nucleus_summary, convert_to_numpy=True)
            embedding = np.array([embedding]).astype('float32')
            
            # Add to FAISS
            faiss_index = self.index.ntotal  # Current number of vectors
            self.index.add(embedding)
            
            # Map FAISS index to article ID
            self.id_map[faiss_index] = article_id
            
            # Save index and mapping
            faiss.write_index(self.index, str(self.index_path))
            self._save_id_map()
            
            return faiss_index
            
        except Exception as e:
            print(f" Warning: Could not create embedding: {e}")
            print(f"  Creating fallback mapping...")
            # Fallback: create mapping without embedding
            faiss_index = article_id
            self.id_map[faiss_index] = article_id
            self._save_id_map()
            return faiss_index
    
    def semantic_search(
        self,
        query: str,
        top_k: int = 3
    ) -> List[Tuple[int, float, int]]:
        """
        Search FAISS index for similar articles.
        
        Args:
            query: User search query or follow-up question
            top_k: Number of results to return
        
        Returns:
            List of (article_id, distance, faiss_index) tuples
        """
        try:
            if self.index.ntotal == 0:
                return []
            
            # Generate query embedding using Sentence Transformer
            query_embedding = self.embeddings.encode(query, convert_to_numpy=True)
            query_vector = np.array([query_embedding]).astype('float32')
            
            # Search FAISS
            distances, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))
            
            # Convert FAISS indices to article IDs
            results = []
            for faiss_idx, distance in zip(indices[0], distances[0]):
                if faiss_idx in self.id_map:
                    article_id = self.id_map[faiss_idx]
                    results.append((article_id, float(distance), int(faiss_idx)))
            
            return results
            
        except Exception as e:
            raise RuntimeError(f"Semantic search failed: {str(e)}")
    
    def get_stats(self) -> dict:
        """Get vector store statistics."""
        return {
            "total_vectors": self.index.ntotal,
            "dimension": self.dimension,
            "store_path": str(self.store_dir),
            "index_size_mb": self.index_path.stat().st_size / (1024 * 1024) if self.index_path.exists() else 0
        }


class SemanticSearcher:
    """
    High-level interface for semantic search.
    Combines FAISS vector search with database retrieval.
    """
    
    def __init__(self, db_manager):
        """Initialize searcher with database manager."""
        self.vector_store = VectorStore()
        self.db = db_manager
    
    def search_and_retrieve(
        self,
        query: str,
        top_k: int = 3
    ) -> List[dict]:
        """
        Semantic search + database retrieval.
        Used for "follow-up" questions to provide context.
        
        Args:
            query: User question/query
            top_k: Number of articles to retrieve
        
        Returns:
            List of full article dicts with search scores
        """
        # 1. Vector search via FAISS
        search_results = self.vector_store.semantic_search(query, top_k=top_k)
        
        if not search_results:
            return []
        
        # 2. Retrieve full articles from database
        articles = []
        for article_id, distance, faiss_idx in search_results:
            article = self.db.get_article_by_id(article_id)
            if article:
                article['search_score'] = 1.0 / (1.0 + distance)  # Convert distance to similarity
                article['faiss_index'] = faiss_idx
                articles.append(article)
        
        return articles


if __name__ == "__main__":
    # Test vector store
    print("🔍 Testing Vector Store...\n")
    
    try:
        store = VectorStore()
        
        # Add sample articles
        print("Adding articles to vector store...")
        summaries = [
            "Union Budget 2026 announces 5% tax relief for middle class.",
            "RBI raises repo rate by 50 basis points amid inflation.",
            "Tech startups secure $5B in funding despite market slowdown."
        ]
        
        for idx, summary in enumerate(summaries, 1):
            faiss_idx = store.add_article(idx, summary)
            print(f"  Article {idx} -> FAISS Index {faiss_idx}")
        
        print(f"\n Store Stats: {store.get_stats()}\n")
        
        # Test semantic search
        print("🔎 Semantic Search 'budget tax policy':")
        results = store.semantic_search("budget tax policy", top_k=2)
        for article_id, distance, faiss_idx in results:
            print(f"  - Article {article_id} (distance: {distance:.4f})")
        
    except Exception as e:
        print(f" Error: {e}")
