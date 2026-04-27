import os
import psycopg2
import random
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, session, flash, g, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf.csrf import CSRFProtect
from authlib.integrations.flask_client import OAuth

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default_secret_key")
csrf = CSRFProtect(app)

# --- SESSION CONFIG (Remember Me) ---
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
from flask_session import Session
Session(app)

# --- GOOGLE OAUTH SETUP ---
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

def get_db():
    if 'db' not in g:
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            # For cloud deployment (Render, Heroku, etc.)
            g.db = psycopg2.connect(db_url)
        else:
            # Local fallback
            g.db = psycopg2.connect(
                dbname=os.getenv("DB_NAME"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432")
            )
    return g.db

@app.teardown_appcontext
def close_db(error):
    db = g.pop('db', None)
    if db is not None:
        db.close()

EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


def send_email_otp(to_email, otp):
    subject = "SmartApp OTP Verification"
    body = f"Your OTP is: {otp}"

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        server.send_message(msg)


@app.route('/')
def home():
    return render_template('index.html')


# ---------------- REGISTER ----------------
@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect('/business_dashboard' if session.get('user_role') == 'business' else '/dashboard')
        
    if request.method == 'POST':
        try:
            name = request.form['name']
            email = request.form['email'].strip().lower()
            role = request.form['role'].strip().lower()

            cur = get_db().cursor()

            # ✅ CHECK DUPLICATE EMAIL
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                return render_template('register.html', error="Email already registered ❌")

            otp = str(random.randint(100000, 999999))

            cur.execute(
                "INSERT INTO otp (email, otp_code) VALUES (%s, %s)",
                (email, otp)
            )
            get_db().commit()

            send_email_otp(email, otp)

            session['temp_name'] = name
            session['temp_email'] = email
            session['temp_role'] = role

            return redirect('/verify_email')

        except Exception as e:
            get_db().rollback()
            return "Something went wrong ❌"

    return render_template('register.html')


@app.route('/verify_email', methods=['GET', 'POST'])
def verify_email():
    if request.method == 'POST':
        user_otp = request.form['otp'].strip()
        email = session.get('temp_email')

        cur = get_db().cursor()
        cur.execute("""
            SELECT otp_code FROM otp 
            WHERE email=%s 
            ORDER BY id DESC 
            LIMIT 1
        """, (email,))
        db_otp = cur.fetchone()

        if db_otp and user_otp == str(db_otp[0]):
            return redirect('/set_password')
        else:
            return render_template('verify_email.html', error="Invalid OTP ❌")

    return render_template('verify_email.html')


# ---------------- SET PASSWORD ----------------
@app.route('/set_password', methods=['GET', 'POST'])
def set_password():
    if request.method == 'POST':
        try:
            password = request.form['password']

            name = session.get('temp_name')
            email = session.get('temp_email')
            role = session.get('temp_role', 'user')

            hashed = generate_password_hash(password)

            cur = get_db().cursor()

            # ✅ CHECK AGAIN (IMPORTANT)
            cur.execute("SELECT id FROM users WHERE email=%s", (email,))
            if cur.fetchone():
                return redirect('/login')

            cur.execute("""
                INSERT INTO users (name, email, password, email_verified, role)
                VALUES (%s, %s, %s, TRUE, %s)
            """, (name, email, hashed, role))

            get_db().commit()

            return redirect('/login')

        except Exception as e:
            print(f"Error: {e}")
            get_db().rollback()
            return "Something went wrong ❌"

    return render_template('set_password.html')


# ---------------- LOGIN ----------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect('/business_dashboard' if session.get('user_role') == 'business' else '/dashboard')

    if request.method == 'POST':
        email = request.form['email'].strip().lower()
        password = request.form['password']
        role = request.form['role'].strip().lower()

        cur = get_db().cursor()
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if user and check_password_hash(user[3], password):

            user_role = (user[7] or 'user').strip().lower()
            role = role.strip().lower()

            if user_role != role:
                return render_template('login.html', error="Wrong login type ❌")

            session.permanent = True
            session['user_id'] = user[0]
            session['user_name'] = user[1]
            session['user_role'] = user_role

            # ✅ ADD THIS (LAST LOGIN UPDATE)
            cur.execute("""
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP 
                WHERE id = %s
            """, (user[0],))
            get_db().commit()

            if user_role == "business":
                return redirect('/business_dashboard')
            else:
                return redirect('/dashboard')

        else:
            return render_template('login.html', error="Invalid email or password ❌")

    return render_template('login.html')

# ---------------- FORGOT PASSWORD ----------------
@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form['email'].strip().lower()
        
        cur = get_db().cursor()
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cur.fetchone()
        
        if not user:
            # For security, we don't say if the email exists or not. Simply redirect.
            # But since it's an internal tool for now, we'll flash an error.
            flash("If that email is registered, an OTP has been sent.", "success")
            return redirect('/forgot_password')
            
        otp = str(random.randint(100000, 999999))
        
        cur.execute("INSERT INTO otp (email, otp_code) VALUES (%s, %s)", (email, otp))
        get_db().commit()
        
        send_email_otp(email, otp)
        
        # Store email in session to verify OTP against later
        session['reset_email'] = email
        return render_template('reset_password.html', email=email)
        
    return render_template('forgot_password.html')

# ---------------- RESET PASSWORD ----------------
@app.route('/reset_password', methods=['POST'])
def reset_password():
    email = request.form.get('email') or session.get('reset_email')
    user_otp = request.form['otp'].strip()
    new_password = request.form['password']
    confirm_password = request.form['confirm_password']
    
    if not email:
        flash("Session expired. Please request a new OTP.", "error")
        return redirect('/forgot_password')
        
    if new_password != confirm_password:
        flash("Passwords do not match.", "error")
        return render_template('reset_password.html', email=email)
        
    cur = get_db().cursor()
    cur.execute("SELECT otp_code FROM otp WHERE email=%s ORDER BY id DESC LIMIT 1", (email,))
    db_otp = cur.fetchone()
    
    if db_otp and user_otp == str(db_otp[0]):
        hashed = generate_password_hash(new_password)
        cur.execute("UPDATE users SET password=%s WHERE email=%s", (hashed, email))
        get_db().commit()
        
        # Clear reset session
        session.pop('reset_email', None)
        
        flash("Password reset successfully. You can now login.", "success")
        return redirect('/login')
    else:
        flash("Invalid OTP.", "error")
        return render_template('reset_password.html', email=email)


# ---------------- GOOGLE LOGIN ----------------
@app.route('/login/google')
def login_google():
    # Store requested role in session for the callback
    role = request.args.get('role', 'user')
    session['google_role'] = role
    redirect_uri = url_for('google_callback', _external=True)
    return google.authorize_redirect(redirect_uri)

@app.route('/login/google/callback')
def google_callback():
    try:
        token = google.authorize_access_token()
        user_info = token.get('userinfo')
        if not user_info:
            return "Failed to fetch user info from Google", 400

        email = user_info['email'].strip().lower()
        google_id = user_info['sub']
        name = user_info['name']
        role = session.pop('google_role', 'user').strip().lower()

        cur = get_db().cursor()

        # 1. Check if google_id already exists
        cur.execute("SELECT id, name, role FROM users WHERE google_id = %s", (google_id,))
        user = cur.fetchone()

        if not user:
            # 2. If not, check if email exists (Link Account)
            cur.execute("SELECT id, name, role FROM users WHERE email = %s", (email,))
            user = cur.fetchone()

            if user:
                # Link google_id to existing email
                cur.execute("UPDATE users SET google_id = %s, auth_provider = 'google' WHERE id = %s", (google_id, user[0]))
            else:
                # 3. Create new user
                cur.execute("""
                    INSERT INTO users (name, email, google_id, auth_provider, email_verified, role)
                    VALUES (%s, %s, %s, 'google', TRUE, %s)
                    RETURNING id, name, role
                """, (name, email, google_id, role))
                user = cur.fetchone()

        get_db().commit()

        # ⚠️ Force update last login
        cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user[0],))
        get_db().commit()

        session.permanent = True
        session['user_id'] = user[0]
        session['user_name'] = user[1]
        user_role = (user[2] or 'user').strip().lower()
        session['user_role'] = user_role
        
        if user_role == 'business':
            return redirect('/business_dashboard')
        return redirect('/dashboard')

    except Exception as e:
        print(f"Auth Error: {e}")
        flash("Google Login failed. Please try again.", "error")
        return redirect('/login')


@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect('/login')

    return render_template('dashboard.html',
                           name=session['user_name'],
                           active="dashboard")


@app.route('/business_dashboard')
def business_dashboard():
    if 'user_id' not in session:
        return redirect('/login')

    get_db().rollback()  # 🔥 FIX transaction error

    cur = get_db().cursor()
    cur.execute("""
        SELECT name, last_login 
        FROM users 
        WHERE id = %s
    """, (session['user_id'],))

    user = cur.fetchone()

    return render_template('business_dashboard.html',
                           name=user[0],
                           last_login=user[1],
                           active="dashboard")

@app.route('/business_plans')
def business_plans():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('business_plans.html', active="plans")

@app.route('/business_location')
def business_location():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('business_location.html', active="location")

@app.route('/business_tickets')
def business_tickets():
    if 'user_id' not in session:
        return redirect('/login')
    
    cur = get_db().cursor()
    cur.execute("""
        SELECT title, category, description, status, created_at
        FROM business_service_request
        WHERE user_id=%s
        ORDER BY created_at DESC
    """, (session['user_id'],))
    tickets = cur.fetchall()

    return render_template('business_tickets.html', 
                           tickets=tickets, 
                           active="tickets")

@app.route('/business_custom_request')
def business_custom_request():
    if 'user_id' not in session:
        return redirect('/login')
    
    cur = get_db().cursor()
    cur.execute("""
        SELECT service_type, details, status, created_at
        FROM business_custom_requests
        WHERE user_id=%s
        ORDER BY created_at DESC
    """, (session['user_id'],))
    requests = cur.fetchall()

    return render_template('business_custom_request.html', 
                           requests=requests, 
                           active="custom_request")

# 🔽🔽 ADD THIS BELOW YOUR business_support ROUTE 🔽🔽

# ================= BUSINESS SERVICE REQUEST PAGE =================
@app.route('/business_service_request')
def business_service_request():
    if 'user_id' not in session:
        return redirect('/login')

    get_db().rollback()  # 🔥 FIX transaction error

    cur = get_db().cursor()

    # ✅ FETCH TICKETS
    cur.execute("""
        SELECT title, category, description, status, created_at
        FROM business_service_request
        WHERE user_id=%s
        ORDER BY created_at DESC
    """, (session['user_id'],))
    tickets = cur.fetchall()

    # ✅ FETCH CUSTOM REQUESTS
    cur.execute("""
        SELECT service_type, details, status, created_at
        FROM business_custom_requests
        WHERE user_id=%s
        ORDER BY created_at DESC
    """, (session['user_id'],))
    requests = cur.fetchall()

    return render_template(
        'business_service_request.html',
        tickets=tickets,
        requests=requests,
        active="service"
    )


# ================= ADD BUSINESS TICKET =================
@app.route('/add_business_service_request', methods=['POST'])
def add_business_service_request():
    if 'user_id' not in session:
        return redirect('/login')

    try:
        title = request.form['title']
        category = request.form['category']
        description = request.form['description']

        cur = get_db().cursor()
        cur.execute("""
            INSERT INTO business_service_request 
            (user_id, title, category, description, status, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (session['user_id'], title, category, description, 'Pending'))

        get_db().commit()

    except Exception as e:
        print("ERROR:", e)
        get_db().rollback()

    return redirect('/business_tickets')


# ================= ADD CUSTOM SERVICE REQUEST =================
@app.route('/add_custom_request', methods=['POST'])
def add_custom_request():
    if 'user_id' not in session:
        return redirect('/login')

    try:
        service_type = request.form['service_type']
        details = request.form['details']

        cur = get_db().cursor()
        cur.execute("""
            INSERT INTO business_custom_requests 
            (user_id, service_type, details, status, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (session['user_id'], service_type, details, 'Pending'))

        get_db().commit()

    except Exception as e:
        print("ERROR:", e)
        get_db().rollback()

    return redirect('/business_custom_request')




@app.route('/business_profile')
def business_profile():
    if 'user_id' not in session:
        return redirect('/login')

    cur = get_db().cursor()

    # user info
    cur.execute("""
        SELECT name, email, mobile, mobile_verified 
        FROM users 
        WHERE id=%s
    """, (session['user_id'],))
    user = cur.fetchone()

    # business details
    cur.execute("""
        SELECT company_name, gst, address, city, state
        FROM business_details
        WHERE user_id=%s
    """, (session['user_id'],))
    business = cur.fetchone()

    return render_template('business_profile.html',
                           user=user,
                           business=business,
                           active="profile")


#businessz

@app.route('/save-business_profile', methods=['POST'])
def save_business_profile():
    if 'user_id' not in session:
        return redirect('/login')

    try:
        company = request.form['company']
        gst = request.form['gst']
        address = request.form['address']
        city = request.form['city']
        state = request.form['state']

        cur = get_db().cursor()

        # check if already exists
        cur.execute("SELECT id FROM business_details WHERE user_id=%s", (session['user_id'],))
        exists = cur.fetchone()

        if exists:
            cur.execute("""
                UPDATE business_details
                SET company_name=%s, gst=%s, address=%s, city=%s, state=%s
                WHERE user_id=%s
            """, (company, gst, address, city, state, session['user_id']))
        else:
            cur.execute("""
                INSERT INTO business_details (user_id, company_name, gst, address, city, state)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (session['user_id'], company, gst, address, city, state))

        get_db().commit()

    except Exception as e:
        print(f"Error: {e}")
        get_db().rollback()

    return redirect('/business_profile')





@app.route('/buy-plan/<plan>')
def buy_plan(plan):

    if 'user_id' not in session:
        return redirect('/login')

    user_id = session['user_id']
    plan_type = request.args.get('type', 'quarter')

    plans = {
        "starter": ("Starter Plan", {"quarter": "₹2,499", "half": "₹4,799", "annual": "₹8,172"}),
        "business": ("Business Plan", {"quarter": "₹3,499", "half": "₹6,999", "annual": "₹10,212"}),
        "enterprise": ("Enterprise Plan", {"quarter": "₹5,999", "half": "₹11,499", "annual": "₹15,312"})
    }

    plan_name, price_dict = plans[plan]
    price = price_dict[plan_type]

    start_date = datetime.now()

    if plan_type == "quarter":
        end_date = start_date + timedelta(days=90)
    elif plan_type == "half":
        end_date = start_date + timedelta(days=180)
    else:
        end_date = start_date + timedelta(days=365)

    cur = get_db().cursor()
    cur.execute("""
        INSERT INTO subscriptions (user_id, plan_name, price, start_date, end_date, status)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (user_id, plan_name, price, start_date, end_date, "active"))

    get_db().commit()

    return redirect('/business-billing')


@app.route('/plans')
def plans():
    if 'user_id' not in session:
        return redirect('/login')

    return render_template('plans.html', active="plans")


@app.route('/kyc')
def kyc():
    if 'user_id' not in session:
        return redirect('/login')

    return render_template('kyc.html', active="ekyc")


@app.route('/location')
def location():
    if 'user_id' not in session:
        return redirect('/login')

    return render_template('location.html', active="location")


@app.route('/tips')
def tips():
    if 'user_id' not in session:
        return redirect('/login')

    return render_template('tips.html', active="tips")


@app.route('/support')
def support():
    if 'user_id' not in session:
        return redirect('/login')

    return render_template('support.html', active="support")


# ---------------- TICKETS ----------------
@app.route('/tickets')
def tickets():
    if 'user_id' not in session:
        return redirect('/login')

    cur = get_db().cursor()
    cur.execute("""
        SELECT id, subject, category, description, status 
        FROM tickets 
        WHERE user_id=%s 
        ORDER BY id DESC
    """, (session['user_id'],))

    tickets = cur.fetchall()

    return render_template('tickets.html',
                           tickets=tickets,
                           active="tickets")


@app.route('/add_ticket', methods=['POST'])
def add_ticket():
    if 'user_id' not in session:
        return redirect('/login')

    try:
        subject = request.form['title']
        category = request.form['category']
        desc = request.form['description']

        cur = get_db().cursor()
        cur.execute("""
            INSERT INTO tickets (user_id, subject, category, description, status)
            VALUES (%s, %s, %s, %s, 'open')
        """, (session['user_id'], subject, category, desc))

        get_db().commit()

    except Exception as e:
        print(f"Error: {e}")
        get_db().rollback()

    return redirect('/tickets')


@app.route('/delete_ticket/<int:id>')
def delete_ticket(id):
    if 'user_id' not in session:
        return redirect('/login')

    cur = get_db().cursor()
    cur.execute("""
        DELETE FROM tickets 
        WHERE id=%s AND user_id=%s
    """, (id, session['user_id']))
    get_db().commit()

    return redirect('/tickets')


@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect('/login')

    cur = get_db().cursor()
    cur.execute("""
        SELECT name, email, mobile, mobile_verified 
        FROM users 
        WHERE id=%s
    """, (session['user_id'],))

    user = cur.fetchone()

    return render_template('profile.html',
                           user=user,
                           active="profile")


@app.route('/help')
def help():
    if 'user_id' not in session:
        return redirect('/login')

    return render_template('help.html', active="help")


@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')


@app.route('/send_otp', methods=['POST'])
def send_otp():
    if 'user_id' not in session:
        return redirect('/login')

    mobile = request.form['mobile']
    otp = str(random.randint(100000, 999999))

    cur = get_db().cursor()
    cur.execute(
        "INSERT INTO otp (mobile, otp_code) VALUES (%s, %s)",
        (mobile, otp)
    )
    get_db().commit()

    session['temp_mobile'] = mobile

    return redirect('/verify_otp')


@app.route('/verify_otp', methods=['GET', 'POST'])
def verify_otp():
    if 'user_id' not in session:
        return redirect('/login')

    if request.method == 'POST':
        user_otp = request.form['otp'].strip()
        mobile = session.get('temp_mobile')

        cur = get_db().cursor()
        cur.execute("""
            SELECT otp_code FROM otp 
            WHERE mobile=%s 
            ORDER BY id DESC 
            LIMIT 1
        """, (mobile,))

        db_otp = cur.fetchone()

        if db_otp and user_otp == str(db_otp[0]):
            cur.execute("""
                UPDATE users 
                SET mobile=%s, mobile_verified=TRUE 
                WHERE id=%s
            """, (mobile, session['user_id']))
            get_db().commit()

            return redirect('/profile')

        else:
            return "Invalid OTP ❌"

    return render_template('verify_otp.html')


# ---------------- CHANGE PASSWORD ----------------
@app.route('/change_password', methods=['POST'])
def change_password():
    if 'user_id' not in session:
        return redirect('/login')

    try:
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']

        if new_password != confirm_password:
            flash("Passwords do not match ❌", "error")
            return redirect('/profile')

        hashed = generate_password_hash(new_password)

        cur = get_db().cursor()
        cur.execute("""
            UPDATE users 
            SET password=%s 
            WHERE id=%s
        """, (hashed, session['user_id']))
        get_db().commit()

        flash("Password updated successfully ✅", "success")

    except Exception as e:
        print(f"Error: {e}")
        get_db().rollback()
        flash("Something went wrong ❌", "error")

    return redirect('/profile')


@app.errorhandler(500)
def handle_500(e):
    import traceback
    return f"<pre>{traceback.format_exc()}</pre>", 500


if __name__ == '__main__':
    app.run(debug=True)