import psycopg2

def diagnose():
    target_url = input("Paste your EXTERNAL Database URL: ").strip()
    if not target_url: return

    try:
        conn = psycopg2.connect(target_url)
        cur = conn.cursor()
        
        print("\n--- 🔎 DATABASE DIAGNOSTIC REPORT ---")
        
        # 1. Check Tables
        tables_to_check = [
            'users', 'otp', 'tickets', 'subscriptions', 
            'business_details', 'business_service_request', 'business_custom_requests'
        ]
        
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        existing_tables = [t[0] for t in cur.fetchall()]
        
        for table in tables_to_check:
            status = "✅ Found" if table in existing_tables else "❌ MISSING"
            print(f"Table '{table}': {status}")
            
            if table in existing_tables:
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
                cols = [c[0] for c in cur.fetchall()]
                print(f"   Columns: {', '.join(cols)}")

        cur.close()
        conn.close()
        print("\n--- End of Report ---")
        
    except Exception as e:
        print(f"❌ CONNECTION ERROR: {e}")

if __name__ == "__main__":
    diagnose()
