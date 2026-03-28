from src.database import DatabaseManager

db = DatabaseManager()

# Get total article count
with db.get_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM articles")
    result = cursor.fetchone()
    total = result[0] if result else 0
    print(f"Total articles in database: {total}")
    
    # Test the offset functionality
    print("\nTesting TOP NEWS (offset 0, limit 8):")
    top = db.get_latest_articles(limit=8, offset=0)
    print(f"Got {len(top)} articles")
    for i, article in enumerate(top[:3]):
        print(f"  {i+1}. {article['heading'][:60]}")
    
    print("\nTesting LATEST NEWS (offset 8, limit 8):")
    latest = db.get_latest_articles(limit=8, offset=8)
    print(f"Got {len(latest)} articles")
    for i, article in enumerate(latest[:3]):
        print(f"  {i+1}. {article['heading'][:60]}")
