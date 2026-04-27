import psycopg2

def init_db():
    target_url = input("Please paste your EXTERNAL Database URL from Render: ").strip()
    if not target_url: return

    # The blueprint for your complete database tables
    schema = """
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        auth_provider VARCHAR(50) DEFAULT 'local',
        email_verified BOOLEAN DEFAULT FALSE,
        role VARCHAR(20) DEFAULT 'user',
        mobile VARCHAR(15),
        mobile_verified BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- OTP Table
    CREATE TABLE IF NOT EXISTS otp (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100),
        mobile VARCHAR(15),
        otp_code VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Individual Support Tickets
    CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        subject VARCHAR(200) NOT NULL,
        category VARCHAR(50),
        description TEXT,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Subscriptions / Purchased Plans
    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        plan_name VARCHAR(100) NOT NULL,
        price VARCHAR(50),
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Business Details
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

    -- Business Service Requests
    CREATE TABLE IF NOT EXISTS business_service_request (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        category VARCHAR(50),
        description TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Business Custom Requests
    CREATE TABLE IF NOT EXISTS business_custom_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        service_type VARCHAR(100),
        details TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    try:
        print("--- Connecting to Render ---")
        conn = psycopg2.connect(target_url)
        cur = conn.cursor()
        
        print("--- Creating Tables ---")
        cur.execute(schema)
        conn.commit()
        
        print("✅ SUCCESS! Your cloud database is now fully initialized and ready.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    init_db()
