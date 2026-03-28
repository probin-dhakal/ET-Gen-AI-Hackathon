"""Check what categories exist in the database"""
from src.database import DatabaseManager

db = DatabaseManager()

with db.get_connection() as conn:
    cursor = conn.cursor()
    
    # Check unique categories in database
    cursor.execute("SELECT DISTINCT category FROM articles")
    categories = cursor.fetchall()
    
    print("Categories in database:")
    for cat in categories:
        print(f"  - {cat[0]}")
    
    # Count articles per category
    print("\nArticles per category:")
    cursor.execute("""
        SELECT category, COUNT(*) as count 
        FROM articles 
        GROUP BY category 
        ORDER BY count DESC
    """)
    results = cursor.fetchall()
    for cat, count in results:
        print(f"  {cat}: {count} articles")
