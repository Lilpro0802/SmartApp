import os
import psycopg2
from dotenv import load_dotenv

# Load local .env
load_dotenv()

# THE MISSION:
# Connect to Render and run the SQL file to create your tables.

def deploy():
    # 1. Ask for the External URL (Get this from Render Database page)
    target_url = input("Please paste your EXTERNAL Database URL from Render: ").strip()
    
    if not target_url:
        print("❌ No URL provided. Action cancelled.")
        return

    print("--- Connecting to Render ---")
    try:
        conn = psycopg2.connect(target_url)
        cur = conn.cursor()
        
        # 2. Read your SQL file (with broad encoding support)
        sql_path = os.path.join("database", "smartware.sql")
        print(f"--- Reading {sql_path} ---")
        
        try:
            with open(sql_path, 'r', encoding='utf-8') as f:
                sql_script = f.read()
        except UnicodeDecodeError:
            with open(sql_path, 'r', encoding='latin-1') as f:
                sql_script = f.read()

        # 3. Execute!
        print("--- Running SQL Script on Cloud ---")
        cur.execute(sql_script)
        conn.commit()
        
        print("✅ SUCCESS! Your cloud database is now ready.")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    deploy()
