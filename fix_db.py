import psycopg2

def migrate():
    target_url = input("Paste your EXTERNAL Database URL: ").strip()
    if not target_url: return

    try:
        conn = psycopg2.connect(target_url)
        cur = conn.cursor()
        
        print("--- Adding Missing Columns to 'users' ---")
        try:
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(15);")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT FALSE;")
            conn.commit()
            print("✅ 'users' table patched.")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ 'users' patch warning: {e}")

        # Final check on business details
        print("--- Verifying Business Tables ---")
        try:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS business_details (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                company_name VARCHAR(200),
                gst VARCHAR(50),
                address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            conn.commit()
            print("✅ Business tables verified.")
        except Exception as e:
            conn.rollback()
            print(f"⚠️ Business patch warning: {e}")

        cur.close()
        conn.close()
        print("\n🎉 DATABASE REPAIRED!")
        
    except Exception as e:
        print(f"❌ CONNECTION ERROR: {e}")

if __name__ == "__main__":
    migrate()
