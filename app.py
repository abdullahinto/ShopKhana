# Standard libraries
import hashlib
import io
import logging
import os
import random
import datetime
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import parse_qs, urlencode
import math
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import requests





# Third-party libraries
import cv2
import numpy as np
import pytesseract
from bson import Binary, ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, send_file, session, url_for, flash
from flask_caching import Cache
from flask_dance.contrib.facebook import facebook, make_facebook_blueprint
from flask_dance.contrib.google import google, make_google_blueprint
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_mail import Mail, Message
from flask_pymongo import PyMongo
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from PIL import Image, ImageEnhance, ImageOps
from pymongo import DESCENDING, ReturnDocument
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from pytesseract import Output




app = Flask(__name__)




# Tell Flask to trust headers from NGINX
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)


app.config['SESSION_COOKIE_SECURE'] = True

load_dotenv()  # Loads variables from .env into os.environ



os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)



cache = Cache(config={'CACHE_TYPE': 'SimpleCache'})
cache.init_app(app)

@app.route('/expensive')
@cache.cached(timeout=60)
def expensive_view():
    # something slow
    return "Cached response"



# Configure MongoDB
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopkhana")

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "thisshouldbeasecret")
# Session cookie will expire when the browser closes
app.config["SESSION_PERMANENT"] = False


# Flask-Mail configuration for production
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", 587))
app.config["MAIL_USE_TLS"] = os.getenv("MAIL_USE_TLS", "true").lower() in ["true", "1", "t"]
app.config["MAIL_USE_SSL"] = os.getenv("MAIL_USE_SSL", "false").lower() in ["true", "1", "t"]
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER", app.config["MAIL_USERNAME"])

# app.config.update(
#     TEMPLATES_AUTO_RELOAD=False,
#     SEND_FILE_MAX_AGE_DEFAULT=31536000  # cache static files for 1 year
# )



# Configure file upload folder and allowed extensions (adjust as needed)
# app.config["UPLOAD_FOLDER"] = os.path.join(os.getcwd(), "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

mongo = PyMongo(app)
mail = Mail(app)

# Setup Flask-Login
login_manager = LoginManager(app)
login_manager.login_view = "index"  # if not logged in, redirect to auth page

# Setup itsdangerous serializer
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])


# Ensure Upload Folder Exists
# if not os.path.exists(app.config['UPLOAD_FOLDER']):
#     os.makedirs(app.config['UPLOAD_FOLDER'])

# ---------------
# HELPER FUNCTIONS
# # ---------------


# def allowed_file(filename):
#     return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def mask_email(email):
    try:
        local, domain = email.split("@")
        if len(local) <= 1:
            return email
        # Show the first 3 letter and mask the rest of the local part.
        return local[3] + "*" * (len(local) - 1) + "@" + domain
    except Exception:
        return email

app.jinja_env.filters["mask_email"] = mask_email





def serialize_order_base(d):
    """Common serialization for both endpoints."""
    # product ID & image
    pid = ObjectId(d["product_ids"][0])
    prod = mongo.db.products.find_one({"_id": pid}, {"images": 1}) or {}
    img = (prod.get("images") or [None])[0]
    img_url = img.replace("/upload/", "/upload/w_auto,q_auto/") if img else "/static/img/placeholder.png"

    # review lookup
    review_doc = mongo.db.reviews.find_one({
        "product_id": str(pid),
        "user_email": d.get("user_email", "")
    }) or {}
    review_text = review_doc.get("review", "")
    if len(review_text) > 100:
        review_text = review_text[:100].rsplit(" ", 1)[0] + "…"

    rating = review_doc.get("rating") or (d.get("payment_amount", 0) and round(random.uniform(4.5, 5), 1))

    return {
        "product_id": str(pid),
        "product_image": img_url,
        "product_name": d["product_names"][0],
        "customer_name": d["customer_name"].title(),
        "city": d["province"],
        "payment_amount": d["payment_amount"],
        "transaction_date": d["transaction_date"].isoformat(),
        "review": review_text or "Great product, highly recommend!",
        "rating": rating,
        "avatar_url": f"https://www.gravatar.com/avatar/{hashlib.md5(d.get('user_email','').strip().lower().encode()).hexdigest()}?d=identicon&s=60",
        "product_url": url_for("product_page", product_id=str(pid))
    }

@app.route("/api/testimonials")
def testimonials():
    """Top 5 highest-value, Delivered orders with reviews."""
    docs = list(
        mongo.db.orders.find({"order_status": "Delivered"})
        .sort([("payment_amount", DESCENDING), ("transaction_date", DESCENDING)])
        .limit(5)
    )
    return jsonify([serialize_order_base(d) for d in docs])

@app.route("/api/live-sales")
def live_sales():
    """Recent Delivered orders (last 5 days) for live feed."""
    # datetime is the module, so datetime.datetime & datetime.timedelta work:
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=10)
    docs = list(
        mongo.db.orders.find({"order_arrival_date": {"$gte": cutoff}})
        .sort("order_arrival_date", DESCENDING)
        .limit(10)
    )
    return jsonify([serialize_order_base(d) for d in docs])

 

def get_banners(limit=5):
    """
    Fetch banners from the 'banners' collection.
    Limit the number if needed (e.g., 5).
    """
    banners_cursor = mongo.db.banners.find().limit(limit)
    banners = []
    for ban in banners_cursor:
        ban['_id'] = str(ban['_id'])
        # Expecting that ban.image is now a Cloudinary URL.
        banners.append(ban)
    return banners

def get_flash_sale_products(limit=20):
    """
    Fetch flash sale products from the 'products' collection.
    This query uses a case-insensitive regex to match products with
    promotionCategory like "flash-sale" regardless of case.
    """
    flash_sale_products_cursor = mongo.db.products.find({
        "promotionCategory": {"$regex": "^flash\\s?-?sale$", "$options": "i"}
    }).limit(limit)
    flash_sale_products = list(flash_sale_products_cursor)
    for prod in flash_sale_products:
        prod['_id'] = str(prod['_id'])
        # prod.images now contains Cloudinary URLs
    return flash_sale_products

def get_categories():
    """
    Fetch categories from the 'categories' collection.
    """
    cat_cursor = mongo.db.categories.find()
    categories = []
    for cat in cat_cursor:
        cat['_id'] = str(cat['_id'])
        # Assuming cat.images now holds Cloudinary URLs
        categories.append(cat)
    return categories

def get_just_for_you_products(limit=6):
    """
    Fetch 'Just For You' products.
    """
    all_products = list(mongo.db.products.find())
    random.shuffle(all_products)  # randomize
    just_for_you = []
    for prod in all_products[:limit]:
        prod['_id'] = str(prod['_id'])
        # Use Cloudinary URLs for images stored in prod.images
        just_for_you.append(prod)
    return just_for_you

def get_rec_for_you_products(limit=6):
    """
    Fetch 'Recommended For You' products.
    """
    all_products = list(mongo.db.products.find())
    random.shuffle(all_products)  # randomize
    rec_for_you = []
    for prod in all_products[:limit]:
        prod['_id'] = str(prod['_id'])
        rec_for_you.append(prod)
    return rec_for_you    
    

# ---------------
# ROUTES
# ---------------


class User(UserMixin):
    def __init__(self, user_dict):
        self.id = str(user_dict["_id"])
        self.email = user_dict.get("email")
        self.name = user_dict.get("name")
        self.oauth_provider = user_dict.get("oauth_provider")
    
    @staticmethod
    def get(user_id):
        user_data = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if user_data:
            return User(user_data)
        return None

@login_manager.user_loader
def load_user(user_id):
    user_data = mongo.db.users.find_one({"_id": ObjectId(user_id)})
    if user_data:
        return User(user_data)
    return None



@login_manager.unauthorized_handler
def unauthorized_callback():
    # When a protected endpoint is accessed by a non‑authenticated user,
    # redirect them to the main page with a query parameter indicating login is required.
    flash("Please log in to access that page.", "error")
    return redirect(url_for("main_page", action="login"))



# OAuth for Google
# If you intend to use an endpoint name for redirection, use redirect_to with the endpoint name (not a full URL)
google_bp = make_google_blueprint(
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    scope=[
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ],
    redirect_to="google_login"  # This should be the endpoint name, not the full URL.
)

app.register_blueprint(google_bp, url_prefix="/login")



from flask import url_for, flash, redirect, request, render_template
from itsdangerous import URLSafeTimedSerializer

@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get("email")
        user = mongo.db.users.find_one({"email": email})
        if user:
            # Generate a secure token valid for 1 hour
            token = serializer.dumps(email, salt='password-reset-salt')
            reset_url = url_for('reset_password', token=token, _external=True)

            subject = "🔒 ShopKhana Password Reset Request"

            # Plain-text fallback
            plaintext = f"""Hello {user.get('name', '')},

We received a request to reset the password for your ShopKhana account.

Reset Link:
{reset_url}

This link will expire in 1 hour. If you did not request a reset, simply ignore this email.

Thank you,
ShopKhana Team
"""

            # HTML email
            html_content = f"""<html>
  <body style="margin:0; padding:0; background-color:#fffbe6; font-family:Segoe UI, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0; background:#fffbe6;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border:2px solid #FFA726; border-radius:8px; overflow:hidden;">
            <!-- Title -->
            <tr>
              <td style="padding:20px; text-align:center;">
                <h2 style="margin:0; color:#FB8C00;">🔒 Password Reset Request</h2>
              </td>
            </tr>
            <!-- Message -->
            <tr>
              <td style="padding:0 20px 20px 20px; color:#333;">
                <p>Hello {user.get('name', '')},</p>
                <p>We received a request to reset your ShopKhana password. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.</p>
                <p style="text-align:center; margin:30px 0;">
                  <a href="{reset_url}" target="_blank"
                     style="background:linear-gradient(135deg,#FFA726,#FFB300);
                            color:#ffffff;
                            padding:14px 28px;
                            text-decoration:none;
                            border-radius:6px;
                            font-size:16px;
                            font-weight:bold;">
                    Reset Password
                  </a>
                </p>
                <p>If the button doesn’t work, copy and paste this URL into your browser:</p>
                <p style="word-break:break-all; color:#E65100;">{reset_url}</p>
                <p>If you did not request a password reset, simply ignore this email—your account is safe.</p>
                <p>Thank you,<br>
                   <span style="color:#FB8C00; font-weight:bold;">ShopKhana Team</span>
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#FFF8E1; text-align:center; padding:15px; font-size:12px; color:#666;">
                © {datetime.datetime.utcnow().year} ShopKhana. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""

            # Send email
            msg = Message(subject, recipients=[email])
            msg.body = plaintext
            msg.html = html_content
            msg.content_subtype = "html"
            try:
                mail.send(msg)
                flash('A password reset link has been sent to your email. Please check your gmail inbox', "info")
            except Exception as e:
                app.logger.error("Error sending password reset email: %s", e)
                flash("Error sending reset email. Please try again later.", "error")

        else:
            flash("Email not found. Please check and try again.", "error")

        return redirect(url_for('forgot_password'))

    return render_template('forgot_password.html')


@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        flash("The password reset link has expired.", "error")
        return redirect(url_for('forgot_password'))
    except BadSignature:
        flash("Invalid password reset link.", "error")
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        new_password = request.form.get("newPassword")
        hashed_pw = generate_password_hash(new_password)
        result = mongo.db.users.update_one({"email": email}, {"$set": {"password": hashed_pw}})
        if result.modified_count:
            flash("Your password has been reset successfully.", "success")
        else:
            flash("There was an error updating your password. Please try again.", "error")
        return redirect(url_for('main_page'))
    
    return render_template('reset_password.html', token=token)



@app.route('/update_cart_item', methods=["POST"])
@login_required
def update_cart_item():
    data = request.get_json()
    user_email = data.get("user_email")
    product_id = data.get("product_id")
    selected_color = data.get("selected_color")
    selected_size = data.get("selected_size")
    new_quantity = data.get("quantity")
    
    if not all([user_email, product_id, selected_color, selected_size, new_quantity]):
        return jsonify({"success": False, "message": "Missing data."}), 400

    result = mongo.db.cart.update_one(
        {
            "user_email": user_email,
            "products": {"$elemMatch": {"product_id": product_id, "selected_color": selected_color, "selected_size": selected_size}}
        },
        {"$set": {"products.$.quantity": new_quantity}}
    )
    if result.modified_count > 0:
        return jsonify({"success": True, "message": "Cart item updated."})
    else:
        return jsonify({"success": False, "message": "Failed to update cart item."}), 400




@app.route('/delete_cart_item', methods=["POST"])
@login_required
def delete_cart_item():
    data = request.get_json()
    user_email = data.get("user_email")
    product_id = data.get("product_id")
    selected_color = data.get("selected_color")
    selected_size = data.get("selected_size")
    
    if not all([user_email, product_id, selected_color, selected_size]):
        return jsonify({"success": False, "message": "Missing data."}), 400

    result = mongo.db.cart.update_one(
        {"user_email": user_email},
        {"$pull": {"products": {"product_id": product_id, "selected_color": selected_color, "selected_size": selected_size}}}
    )
    if result.modified_count > 0:
        return jsonify({"success": True, "message": "Cart item removed."})
    else:
        return jsonify({"success": False, "message": "Failed to remove cart item."}), 400



@app.route('/delete_cart_selected', methods=["POST"])
@login_required
def delete_cart_selected():
    data = request.get_json()
    user_email = data.get("user_email")
    items_to_remove = data.get("items", [])
    if not items_to_remove:
        return jsonify({"success": False, "message": "No items specified."}), 400

    for item in items_to_remove:
        product_id = item.get("product_id")
        selected_color = item.get("selected_color")
        selected_size = item.get("selected_size")
        mongo.db.cart.update_one(
            {"user_email": user_email},
            {"$pull": {"products": {"product_id": product_id, "selected_color": selected_color, "selected_size": selected_size}}}
        )
    return jsonify({"success": True, "message": "Selected items removed."})


@app.route('/delete_cart_all', methods=["POST"])
@login_required
def delete_cart_all():
    user_email = current_user.email
    result = mongo.db.cart.update_one(
        {"user_email": user_email},
        {"$set": {"products": []}}
    )
    return jsonify({"success": True, "message": "All cart items removed."})






# Email/Password Sign Up
@app.route('/signup', methods=['POST'])
def signup():
    email = request.form.get("signupEmail")
    password = request.form.get("signupPassword")
    existing_user = mongo.db.users.find_one({"email": email})
    if existing_user:
        flash("User already exists. Please log in.", "error")
        return redirect(url_for("main_page", action="login"))
    hashed_pw = generate_password_hash(password)
    new_user = {"email": email, "password": hashed_pw, "name": email.split("@")[0]}
    result = mongo.db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    login_user(User(new_user))
    flash("Sign up successful!", "success")
    return redirect(url_for("main_page"))

# Email/Password Login
@app.route('/login', methods=['POST'])
def login():
    email = request.form.get("loginEmail")
    password = request.form.get("loginPassword")
    user_data = mongo.db.users.find_one({"email": email})
    if user_data and check_password_hash(user_data["password"], password):
        login_user(User(user_data))
        flash("Logged in successfully!", "success")
        return redirect(url_for("main_page"))
    else:
        flash("Invalid credentials. Please try again.", "error")
        return redirect(url_for("main_page", action="login"))

# Logout
@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash("Logged out successfully.", "success")
    return redirect(url_for("main_page"))


@app.route('/google_login')
def google_login():
    logger.debug("Entered /google_login endpoint.")
    if not google.authorized:
        logger.debug("User not authorized with Google. Redirecting to google.login")
        return redirect(url_for("google.login"))

    resp = google.get("/oauth2/v2/userinfo")
    if not resp.ok:
        logger.error("Failed to fetch user info from Google. Status: %s", resp.status_code)
        flash("Failed to fetch user info from Google.", "error")
        return redirect(url_for("main_page", action="login"))
    
    user_info = resp.json()
    logger.debug("Google user info retrieved: %s", user_info)
    email = user_info.get("email")
    if not email:
        logger.error("Google user info missing email.")
        flash("Google did not provide an email.", "error")
        return redirect(url_for("auth", action="login"))
    
    name = user_info.get("name", email.split("@")[0])
    user_data = mongo.db.users.find_one({"email": email})
    
    if not user_data:
        logger.debug("No existing user found for email: %s. Creating new user.", email)
        new_user = {"email": email, "name": name, "oauth_provider": "google"}
        result = mongo.db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user_obj = User(new_user)
        logger.debug("New user created with ID: %s", new_user["_id"])
    else:
        logger.debug("Existing user found for email: %s", email)
        user_obj = User(user_data)
    
    login_user(user_obj)
    flash("Logged in with Google!", "success")
    logger.info("User %s logged in successfully via Google.", email)
    return redirect(url_for("main_page"))


# OAuth for Facebook
facebook_bp = make_facebook_blueprint(
    client_id=os.getenv("FACEBOOK_CLIENT_ID"),
    client_secret=os.getenv("FACEBOOK_CLIENT_SECRET"),
    scope=["email"],
    redirect_url="/facebook_login"
)
app.register_blueprint(facebook_bp, url_prefix="/login")

@app.route('/facebook_login')
def facebook_login():
    if not facebook.authorized:
        return redirect(url_for("facebook.login"))
    resp = facebook.get("/me?fields=id,name,email")
    if not resp.ok:
        flash("Failed to fetch user info from Facebook.", "error")
        return redirect(url_for("main_page", action="login"))
    user_info = resp.json()
    email = user_info.get("email")
    name = user_info.get("name", email.split("@")[0] if email else "User")
    if not email:
        flash("Facebook did not provide an email.", "error")
        return redirect(url_for("main_page", action="login"))
    user_data = mongo.db.users.find_one({"email": email})
    if not user_data:
        new_user = {"email": email, "name": name, "oauth_provider": "facebook"}
        result = mongo.db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user_obj = User(new_user)
    else:
        user_obj = User(user_data)
    login_user(user_obj)
    flash("Logged in with Facebook!", "success")
    return redirect(url_for("main_page"))




@app.route('/')
def main_page():
    """
    Serve the main_page.html with:
    - Banners
    - Flash Sale products
    - Categories
    - Just For You products
    """
    banners = get_banners(limit=5)
    flash_sale_products = get_flash_sale_products(limit=10)
    categories = get_categories()
    just_for_you_products = get_just_for_you_products(limit=40)

    # Pass the data to main_page.html (Jinja2 template)
    return render_template(
        'main_page.html',
        banners=banners,
        flash_sale_products=flash_sale_products,
        categories=categories,
        just_for_you_products=just_for_you_products
    )



@app.route('/banner/<banner_id>')
def show_banner_products(banner_id):
    banner = mongo.db.banners.find_one({"_id": ObjectId(banner_id)})
    if not banner:
        return "Banner not found", 404

    products = []
    # Use a case‑insensitive regex to match exactly the banner's category value.
    if banner.get("promotionCategory"):
        products_cursor = mongo.db.products.find({
            "promotionCategory": {
                "$regex": f"^{banner['promotionCategory']}$", 
                "$options": "i"
            }
        }).limit(40)
        products = list(products_cursor)
    elif banner.get("productCategory"):
        products_cursor = mongo.db.products.find({
            "productCategory": {
                "$regex": f"^{banner['productCategory']}$", 
                "$options": "i"
            }
        })
        products = list(products_cursor)
    
    for p in products:
        p["_id"] = str(p["_id"])
    return render_template(
        'banner_products.html',
        banner=banner,
        products=products
    )


@app.route('/promotion/<promo_category>')
def promotion_products(promo_category):
    # Get the current page number from the query parameters (default is 1)
    page = request.args.get('page', 1, type=int)
    limit = 30  # Number of products per page (adjust as needed)
    skip = (page - 1) * limit

    # Build a case-insensitive filter query on promotionCategory
    filter_query = {
        "promotionCategory": {
            "$regex": f"^{promo_category}$", 
            "$options": "i"
        }
    }

    # Count total matching documents for pagination
    total_count = mongo.db.products.count_documents(filter_query)
    total_pages = (total_count + limit - 1) // limit

    # Fetch the products for this page
    products_cursor = mongo.db.products.find(filter_query).skip(skip).limit(limit)
    products = []
    for product in products_cursor:
        product["_id"] = str(product["_id"])
        products.append(product)

    return render_template(
        'promotion_products.html',
        promo_category=promo_category,
        products=products,
        current_page=page,
        total_pages=total_pages,
        total_count=total_count
    )



@app.route('/category/<sk_category>')
def category_products(sk_category):
    # Get the current page from the query parameters (default is 1)
    page = request.args.get('page', 1, type=int)
    limit = 30  # Number of products per page
    skip = (page - 1) * limit

    # Build a case-insensitive filter for products with the given category.
    # Here, we assume that the field "productCategory" in products documents is used.
    filter_query = {
        "productCategory": {
            "$regex": f"^{sk_category}$",
            "$options": "i"
        }
    }

    # Count total matching products
    total_count = mongo.db.products.count_documents(filter_query)
    total_pages = (total_count + limit - 1) // limit

    # Fetch the products for this page
    products_cursor = mongo.db.products.find(filter_query).skip(skip).limit(limit)
    products = []
    for product in products_cursor:
        product["_id"] = str(product["_id"])
        products.append(product)

    # Render the category_page.html template with the products and pagination info
    return render_template(
        'category_page.html',
        sk_category=sk_category,
        products=products,
        current_page=page,
        total_pages=total_pages,
        total_count=total_count
    )



@app.route('/api/categories_paginated')
def categories_paginated():
    # Read the page parameter (default page 1) and set limit (e.g., 14 per page)
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 14, type=int)
    skip = (page - 1) * limit

    categories_cursor = mongo.db.categories.find().skip(skip).limit(limit)
    categories = []
    for cat in categories_cursor:
        cat['_id'] = str(cat['_id'])
        categories.append(cat)
    return jsonify(categories)



# Endpoint for autocomplete search suggestions
@app.route('/api/search')
def api_search():
    query = request.args.get('query', '')
    if query:
        # This regex will match the query anywhere in the title (not anchored)
        regex = {"$regex": query, "$options": "i"}
        products_cursor = mongo.db.products.find({"title": regex}).limit(10)
        products = []
        for product in products_cursor:
            product["_id"] = str(product["_id"])
            products.append(product)
        if not products:
            return jsonify({"message": "No products were found matching your search."}), 200
        return jsonify(products), 200
    return jsonify([]), 200



# Custom Jinja2 filter to update query parameters in URLs
@app.template_filter('update_query')
def update_query(url, **kwargs):
    # Get current query string as a dict
    q = parse_qs(request.query_string.decode('utf-8'))
    # Update with provided kwargs (convert all values to strings)
    for key, value in kwargs.items():
        q[key] = [str(value)]
    return url + "?" + urlencode(q, doseq=True)

@app.route('/search_results')
def search_results():
    # Get query parameters
    query = request.args.get('query', '')
    sort_param = request.args.get('sort', '')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    price_range = request.args.get('price_range', '')  # e.g., "300-500pkr", "2000+"
    color_filter = request.args.get('color', '')
    brand_filter = request.args.get('brand', '')
    promotion_filter = request.args.get('promotion', '')

    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    limit = 30  # 30 items per page
    skip = (page - 1) * limit

    # Build filter query
    filter_query = {}
    if query:
        filter_query["title"] = {"$regex": query, "$options": "i"}
    
    # Price filtering using static range
    if price_range:
        if "-" in price_range:
            try:
                parts = price_range.lower().replace("pkr", "").split("-")
                min_val = float(parts[0])
                max_val = float(parts[1])
                filter_query["discountedPrice"] = {"$gte": min_val, "$lte": max_val}
            except Exception:
                pass
        elif price_range.endswith("+"):
            try:
                min_val = float(price_range[:-1])
                filter_query["discountedPrice"] = {"$gte": min_val}
            except Exception:
                pass
    else:
        # Custom price range inputs
        if min_price is not None or max_price is not None:
            price_query = {}
            if min_price is not None:
                price_query["$gte"] = min_price
            if max_price is not None:
                price_query["$lte"] = max_price
            filter_query["discountedPrice"] = price_query

    if color_filter:
        filter_query["colors"] = {"$regex": color_filter, "$options": "i"}
    if brand_filter:
        filter_query["brandName"] = {"$regex": f"^{brand_filter}$", "$options": "i"}
    if promotion_filter:
        filter_query["promotionCategory"] = {"$regex": f"^{promotion_filter}$", "$options": "i"}

    # Sorting
    sort_field = None
    sort_direction = 1
    if sort_param == "price_asc":
        sort_field = "discountedPrice"
    elif sort_param == "price_desc":
        sort_field = "discountedPrice"
        sort_direction = -1
    elif sort_param == "brand_asc":
        sort_field = "brandName"
    elif sort_param == "brand_desc":
        sort_field = "brandName"
        sort_direction = -1
    elif sort_param == "promotion_asc":
        sort_field = "promotionCategory"
    elif sort_param == "promotion_desc":
        sort_field = "promotionCategory"
        sort_direction = -1

    # Count total matching documents
    total_count = mongo.db.products.count_documents(filter_query)
    total_pages = (total_count + limit - 1) // limit

    # Fetch paginated results
    products_cursor = mongo.db.products.find(filter_query)
    if sort_field:
        products_cursor = products_cursor.sort(sort_field, sort_direction)
    products_cursor = products_cursor.skip(skip).limit(limit)
    
    products = []
    for product in products_cursor:
        product["_id"] = str(product["_id"])
        products.append(product)

    # Compute unique brands and colors from the filtered products
    unique_brands = set()
    unique_colors = set()
    for product in products:
        if product.get("brandName"):
            unique_brands.add(product["brandName"])
        if product.get("colors"):
            for col in product["colors"]:
                unique_colors.add(col)
    brands = sorted(unique_brands)
    colors = sorted(unique_colors)

    return render_template('search_results.html',
                           query=query,
                           products=products,
                           brands=brands,
                           colors=colors,
                           current_page=page,
                           total_pages=total_pages,
                           total_count=total_count)



# import gridfs


# fs = gridfs.GridFS(mongo.db)
# # --- Helper Functions for the Main Website ---

def allowed_file(filename):
    """Check if the file has one of the allowed extensions."""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# --- Updated Endpoints ---

@app.route('/product/<product_id>')
def product_page(product_id):
    try:
        # Fetch the product document
        product = mongo.db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            flash("Product not found.", "error")
            return redirect(url_for("main_page"))
        product["_id"] = str(product["_id"])
        
        # Generate the full external URL for the product
        product_url = url_for("product_page", product_id=product_id, _external=True)
        
        # Fetch reviews for this product. 
        # Ensure that the reviews collection stores product_id as a string that matches product_id.
        reviews_cursor = mongo.db.reviews.find({"product_id": product_id})
        reviews = list(reviews_cursor)
        for rev in reviews:
            # If _id is stored as ObjectId, convert it; if already a string, it will remain unchanged.
            if not isinstance(rev.get("_id"), str):
                rev["_id"] = str(rev["_id"])
        
        # Fetch FAQs by matching ProductLink with the current product_url
        faqs_cursor = mongo.db.faqs.find({"ProductLink": product_url, "Status": {"$ne": "Unanswered"}})
        faqs = list(faqs_cursor)
        for faq in faqs:
            # Convert ObjectId to string if necessary.
            if not isinstance(faq.get("_id"), str):
                faq["_id"] = str(faq["_id"])
        
        # Prepare extra info from the product document
        extra_info = {
            "description": product.get("description", "No description available."),
            "additional_info": product.get("additionalInfo", []),
            "category": product.get("productCategory", "Uncategorized")
        }
        
        # Debugging prints (remove in production)
        print("Product:", product)
        print("Reviews:", reviews)
        print("FAQs:", faqs)

        rec_for_you_products = get_rec_for_you_products(limit=40)
        
        return render_template("product_details.html",
                               product=product,
                               reviews=reviews,
                               faqs=faqs,
                               extra_info=extra_info,
                               rec_for_you_products=rec_for_you_products)
    except Exception as e:
        logger.error("Error fetching product details: %s", e)
        flash("An error occurred while fetching product details.", "error")
        return redirect(url_for("main_page"))


import cloudinary
import cloudinary.uploader
import cloudinary.api




# Configure Cloudinary credentials (set these as environment variables or directly)
cloudinary.config( 
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "your_cloud_name"),  
    api_key = os.getenv("CLOUDINARY_API_KEY", "your_api_key"),  
    api_secret = os.getenv("CLOUDINARY_API_SECRET", "your_api_secret")
)



# --------------------------
# Updated Endpoint: Submit Review
# --------------------------
@app.route('/submit_review/<product_id>', methods=["POST"])
@login_required
def submit_review(product_id):
    try:
        review_text = request.form.get("review_text", "").strip()
        rating = float(request.form.get("rating", 0))
        if not review_text or rating <= 0:
            flash("Please provide a valid review and rating.", "error")
            return redirect(url_for("product_page", product_id=product_id))
        
        # Build the product's full URL (external)
        product_url = url_for("product_page", product_id=product_id, _external=True)
        
        # Retrieve uploaded files from the input named "review_images"
        files = request.files.getlist("review_images")
        app.logger.debug("Number of files received: %s", len(files))
        img_urls = []
        for file in files:
            app.logger.debug("Processing file: %s", file.filename)
            if file and allowed_file(file.filename):
                # Upload file to Cloudinary instead of saving locally
                upload_result = cloudinary.uploader.upload(file)
                url = upload_result.get("secure_url")
                if url:
                    img_urls.append(url)
                    app.logger.debug("Uploaded file '%s' to Cloudinary with URL: %s", file.filename, url)
                else:
                    app.logger.debug("Failed to get secure_url for file: %s", file.filename)
            else:
                app.logger.debug("File skipped (not allowed or empty): %s", file.filename)
        
        # If no images uploaded, img_urls remains an empty list
        review_record = {
            "product_id": product_id,
            "ProductLink": product_url,
            "user_email": current_user.email,
            "review": review_text,
            "rating": rating,
            "img": img_urls  # List of Cloudinary image URLs
        }
        mongo.db.reviews.insert_one(review_record)
        flash("Your review has been submitted successfully!", "success")
        return redirect(url_for("product_page", product_id=product_id))
    except Exception as e:
        app.logger.error("Error submitting review: %s", e)
        flash("Error submitting your review. Please try again later.", "error")
        return redirect(url_for("product_page", product_id=product_id))
    





@app.route('/add_to_cart/<product_id>', methods=["POST"])
@login_required
def add_to_cart(product_id):
    try:
        # Get selected variation color and quantity from the POST data.
        selected_color = request.form.get("selected_color", "").strip()
        selected_size = request.form.get("selected_size", "").strip()
        quantity = int(request.form.get("quantity", 1))
        if not selected_color:
            return jsonify({"success": False, "message": "Please select a color variation."}), 400
        if not selected_size:
            return jsonify({"success": False, "message": "Please select a size variation."}), 400
        
        user_email = current_user.email
        
        # Find the cart document for this user.
        cart_doc = mongo.db.cart.find_one({"user_email": user_email})
        if cart_doc:
            # Check if the product (with the same color and size) already exists in the products array.
            existing_product = None
            for prod in cart_doc.get("products", []):
                if prod.get("product_id") == product_id and prod.get("selected_color") == selected_color and prod.get("selected_size") == selected_size:
                    existing_product = prod
                    break

            if existing_product:
                # If found, increment the quantity.
                mongo.db.cart.update_one(
                    {
                        "user_email": user_email,
                        "products.product_id": product_id,
                        "products.selected_color": selected_color,
                        "products.selected_size": selected_size
                    },
                    {"$inc": {"products.$.quantity": quantity}}
                )
                message = "Cart updated successfully."
            else:
                # If not found, append a new product object to the products array.
                mongo.db.cart.update_one(
                    {"user_email": user_email},
                    {"$push": {"products": {"product_id": product_id,
                                             "selected_color": selected_color,
                                             "selected_size": selected_size,
                                             "quantity": quantity}}}
                )
                message = "Item added to cart successfully."
        else:
            # No cart document for the user yet, so create one.
            new_cart = {
                "user_email": user_email,
                "products": [{
                    "product_id": product_id,
                    "selected_color": selected_color,
                    "selected_size": selected_size,
                    "quantity": quantity
                }]
            }
            mongo.db.cart.insert_one(new_cart)
            message = "Item added to cart successfully."
        
        return jsonify({"success": True, "message": message})
    except Exception as e:
        app.logger.error("Error in add_to_cart: %s", e)
        return jsonify({"success": False, "message": "Error adding to cart."}), 500


@app.route('/add_to_wishlist/<product_id>', methods=["POST"])
@login_required
def add_to_wishlist(product_id):
    try:
        selected_color = request.form.get("selected_color", "").strip()
        selected_size = request.form.get("selected_size", "").strip()
        if not selected_color:
            return jsonify({"success": False, "message": "Please select a color variation."}), 400
        
        if not selected_size:
            return jsonify({"success": False, "message": "Please select a size variation."}), 400

        user_email = current_user.email
        
        # Find the wishlist document for this user.
        wishlist_doc = mongo.db.wishlist.find_one({"user_email": user_email})
        if wishlist_doc:
            # Check if the product (with the same color) is already in the wishlist.
            exists = any(
                item.get("product_id") == product_id and item.get("selected_color") == selected_color and  item.get("selected_size") == selected_size
                for item in wishlist_doc.get("products", [])
            )
            if exists:
                message = "Item is already in your wishlist."
            else:
                mongo.db.wishlist.update_one(
                    {"user_email": user_email},
                    {"$push": {"products": {"product_id": product_id,
                                             "selected_color": selected_color, "selected_size": selected_size}}}
                )
                message = "Item added to wishlist successfully."
        else:
            # No wishlist document for the user, so create one.
            new_wishlist = {
                "user_email": user_email,
                "products": [{
                    "product_id": product_id,
                    "selected_color": selected_color,
                    "selected_size": selected_size
                }]
            }
            mongo.db.wishlist.insert_one(new_wishlist)
            message = "Item added to wishlist successfully."
        
        return jsonify({"success": True, "message": message})
    except Exception as e:
        app.logger.error("Error in add_to_wishlist: %s", e)
        return jsonify({"success": False, "message": "Error adding to wishlist."}), 500

    

    
# Ask a Question: Anyone can ask a question about a product.
@app.route('/ask_question', methods=["POST"])
def ask_question():
    product_link = request.form.get("product_link")
    question = request.form.get("question")
    if not product_link or not question:
        flash("Please provide both product link and your question.", "error")
        return redirect(request.referrer or url_for("product_page"))
    # Insert the FAQ record; answer is initially "N/A" and status "Unanswered"
    faq_record = {
        "ProductLink": product_link,
        "Question": question,
        "Answer": "N/A",
        "Status": "Unanswered"
    }
    mongo.db.faqs.insert_one(faq_record)
    flash("Your question has been submitted.", "success")
    return redirect(request.referrer or url_for("product_page"))



# Manage Account Page – Render the page with pre-populated info.
@app.route('/manage_account')
@login_required
def manage_account():
    user_email = current_user.email
    # Fetch personal info and addresses from del_info.
    del_info = mongo.db.del_info.find_one({"user_email": user_email}) or {}
    # Fetch user credentials from users collection.
    user_doc = mongo.db.users.find_one({"email": user_email}) or {}
    return render_template("manage_account.html", del_info=del_info, user_doc=user_doc)

# Update Profile (Personal Information) Endpoint.
@app.route('/update_profile', methods=["POST"])
@login_required
def update_profile():
    user_email = current_user.email
    full_name = request.form.get("accountName", "").strip()
    contact_email = request.form.get("accountEmail", "").strip()
    phone_number = request.form.get("accountPhone", "").strip()

    if not (full_name and contact_email and phone_number):
        return jsonify({"success": False, "message": "All fields are required."}), 400

    record = {
        "full_name": full_name,
        "contact_email": contact_email,
        "phone_number": phone_number
    }
    try:
        mongo.db.del_info.update_one({"user_email": user_email}, {"$set": record}, upsert=True)
        return jsonify({"success": True, "message": "Profile updated successfully."})
    except Exception as e:
        app.logger.error("Error updating profile: %s", e)
        return jsonify({"success": False, "message": "Error updating profile."}), 500

# Update Security (Password) Endpoint.
@app.route('/update_security', methods=["POST"])
@login_required
def update_security():
    user_email = current_user.email
    current_password = request.form.get("currentPassword", "").strip()
    new_password = request.form.get("newPassword", "").strip()
    confirm_password = request.form.get("confirmPassword", "").strip()

    if not (current_password and new_password and confirm_password):
        return jsonify({"success": False, "message": "All password fields are required."}), 400
    if new_password != confirm_password:
        return jsonify({"success": False, "message": "New passwords do not match."}), 400

    user_doc = mongo.db.users.find_one({"email": user_email})
    if not user_doc or not check_password_hash(user_doc.get("password", ""), current_password):
        return jsonify({"success": False, "message": "Current password is incorrect."}), 400

    hashed_pw = generate_password_hash(new_password)
    try:
        mongo.db.users.update_one({"email": user_email}, {"$set": {"password": hashed_pw}})
        return jsonify({"success": True, "message": "Password updated successfully."})
    except Exception as e:
        app.logger.error("Error updating password: %s", e)
        return jsonify({"success": False, "message": "Error updating password."}), 500

# Update Addresses Endpoint.
@app.route('/update_address', methods=["POST"])
@login_required
def update_address():
    user_email = current_user.email
    address = request.form.get("addressLine1", "").strip()
    area = request.form.get("area", "").strip()
    colony = request.form.get("colony", "").strip()
    city = request.form.get("city", "").strip()
    province = request.form.get("province", "").strip()
    zip_code = request.form.get("zip", "").strip()
  

    if not (address and area and colony and city and province and zip_code):
        return jsonify({"success": False, "message": "All address fields are required."}), 400

    address_record = {
        "address": address,
        "area": area,
        "colony": colony,
        "city": city,
        "province": province,
        "zip": zip_code,
     
    }
    try:
        mongo.db.del_info.update_one({"user_email": user_email}, {"$set": address_record}, upsert=True)
        return jsonify({"success": True, "message": "Address updated successfully."})
    except Exception as e:
        app.logger.error("Error updating address: %s", e)
        return jsonify({"success": False, "message": "Error updating address."}), 500




# 1. Render Wishlist Page
@app.route('/my-wishlist')
@login_required
def my_wishlist():
    user_email = current_user.email
    wishlist_doc = mongo.db.wishlist.find_one({"user_email": user_email})
    wishlist_items = []
    if wishlist_doc and "products" in wishlist_doc:
        for item in wishlist_doc["products"]:
            product_id = item.get("product_id")
            selected_color = item.get("selected_color", "N/A")
            selected_size = item.get("selected_size", "N/A")
            product = mongo.db.products.find_one(
                {"_id": ObjectId(product_id)},
                {
                    "title": 1,
                    "images": 1,
                    "productCategory": 1,
                    "discountedPrice": 1,
                    "originalPrice": 1,
                    "discountPercent": 1,
                    "brandName": 1
                }
            )
            if product:
                product["_id"] = str(product["_id"])
                wishlist_items.append({
                    "product_id": product["_id"],
                    "title": product.get("title", "No Title"),
                    "image": product.get("images", [""])[0],
                    "productCategory": product.get("productCategory", "Uncategorized"),
                    "brand": product.get("brandName", "N/A"),
                    "selected_color": selected_color,
                    "selected_size": selected_size,
                    "discountPrice": float(product.get("discountedPrice", 0)),
                    "originalPrice": float(product.get("originalPrice", 0)),
                    "discountPercent": product.get("discountPercent", 0)
                })
    return render_template("my_wish.html", wishlist_items=wishlist_items)

# 2. Delete a Single Wishlist Item
@app.route('/my_wish/delete/<product_id>', methods=["POST"])
@login_required
def delete_wishlist_item(product_id):
    selected_color = request.form.get("selected_color", "").strip()
    selected_size = request.form.get("selected_size", "").strip()
    user_email = current_user.email
    result = mongo.db.wishlist.update_one(
        {"user_email": user_email},
        {"$pull": {"products": {"product_id": product_id, "selected_color": selected_color, "selected_size": selected_size}}}   
    )
    if result.modified_count > 0:
        return "Wishlist item removed successfully.", 200
    else:
        return "Error removing wishlist item.", 400

# 3. Delete All Wishlist Items
@app.route('/my_wish/delete_all', methods=["POST"])
@login_required
def delete_all_wishlist():
    user_email = current_user.email
    result = mongo.db.wishlist.update_one(
        {"user_email": user_email},
        {"$set": {"products": []}}
    )
    return "All wishlist items removed successfully.", 200

# 4. Delete Selected Wishlist Items (Bulk)
@app.route('/my_wish/delete_selected', methods=["POST"])
@login_required
def delete_selected_wishlist():
    # Expecting a URL-encoded string of selected_ids separated by commas.
    selected_ids_str = request.form.get("selected_ids", "")
    if not selected_ids_str:
        return "No items specified.", 400
    # For simplicity, assume each ID is a product_id.
    selected_ids = [pid.strip() for pid in selected_ids_str.split(",")]
    user_email = current_user.email
    # Remove each matching product from the user's wishlist.
    for pid in selected_ids:
        mongo.db.wishlist.update_one(
            {"user_email": user_email},
            {"$pull": {"products": {"product_id": pid}}}
        )
    return "Selected wishlist items removed successfully.", 200

# 5. Share Wishlist Item (dummy implementation)
@app.route('/my_wish/share/<product_id>', methods=["GET"])
@login_required
def share_wishlist_item(product_id):
    # This dummy implementation returns a share URL based on the product ID.
    share_url = request.host_url.rstrip("/") + "/product/" + product_id
    return jsonify({"share_url": share_url})




@app.route('/check-delivered-orders')
@login_required
def check_delivered_orders():
    user_email = current_user.email
    product_id = request.args.get('product_id')

    if not product_id:
        return jsonify({'hasDelivered': False}), 400

    # Query to check if the user has a delivered order for this product
    query = {
        "user_email": user_email,
        "order_status": {
            "$regex": r"^\s*delivered\s*$",  # Allow leading/trailing spaces
            "$options": "i"
        },
        "product_ids": product_id
    }

    has_delivered = mongo.db.orders.find_one(query) is not None
    return jsonify({"hasDelivered": has_delivered})




@app.route('/my-reviews')
@login_required
def my_reviews():
    user_email = current_user.email
    page = int(request.args.get('page', 1))
    per_page = 10
    sort_order = request.args.get("sort", "newest")  # "newest" or "oldest"
    sort_direction = -1 if sort_order == "newest" else 1

    total_reviews = mongo.db.reviews.count_documents({"user_email": user_email})
    total_pages = math.ceil(total_reviews / per_page)

    # Fetch reviews sorted by _id (newest/oldest)
    reviews_cursor = mongo.db.reviews.find({"user_email": user_email})\
                        .sort("_id", sort_direction)\
                        .skip((page - 1) * per_page).limit(per_page)
    reviews = []
    for review in reviews_cursor:
        review["_id"] = str(review["_id"])
        # Fetch product details using product_id.
        product = mongo.db.products.find_one({"_id": ObjectId(review["product_id"])})
        if product:
            review["product_name"] = product.get("title", "No Title")
            if product.get("images"):
                # Directly use the Cloudinary URLs stored in the product's "images" field.
                review["img_urls"] = product.get("images", [])
            else:
                review["img_urls"] = []
            review["productCategory"] = product.get("productCategory", "Uncategorized")
        else:
            review["product_name"] = "Unknown Product"
            review["img_urls"] = []
            review["productCategory"] = "Uncategorized"
        # Format review date if available (assuming a 'created_at' field exists)
        if "created_at" in review and review["created_at"]:
            review["review_date"] = review["created_at"].strftime("%Y-%m-%d")
        else:
            review["review_date"] = ""
        # Truncate review text to 150 characters for initial display.
        if len(review["review"]) > 150:
            review["review_truncated"] = review["review"][:150] + "..."
        else:
            review["review_truncated"] = review["review"]
        reviews.append(review)

    pagination = {
        "current_page": page,
        "total_pages": total_pages,
        "per_page": per_page,
        "total_reviews": total_reviews
    }
    
    return render_template("my_reviews.html", reviews=reviews, pagination=pagination, sort_order=sort_order)






# Update a review
@app.route('/edit-review/<review_id>', methods=['POST'])
@login_required
def edit_review(review_id):
    new_review_text = request.json.get('review', '')
    new_rating = request.json.get('rating', 0)

    try:
        result = mongo.db.reviews.update_one(
            {"_id": ObjectId(review_id), "user_email": current_user.email},
            {"$set": {"review": new_review_text, "rating": new_rating}}
        )
        if result.modified_count > 0:
            return jsonify({"status": "success", "message": "Review updated successfully!"}), 200
        else:
            return jsonify({"status": "error", "message": "Failed to update the review."}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Delete a review
@app.route('/delete-review/<review_id>', methods=['DELETE'])
@login_required
def delete_review(review_id):
    try:
        result = mongo.db.reviews.delete_one(
            {"_id": ObjectId(review_id), "user_email": current_user.email}
        )
        if result.deleted_count > 0:
            return jsonify({"status": "success", "message": "Review deleted successfully!"}), 200
        else:
            return jsonify({"status": "error", "message": "Failed to delete the review."}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500





from concurrent.futures import ThreadPoolExecutor, as_completed


def upload_image_async(img):
    """Upload a single image to Cloudinary and return its secure URL."""
    try:
        result = cloudinary.uploader.upload(img)
        url = result.get("secure_url")
        if not url:
            logger.error("Cloudinary did not return secure_url for image: %s", img.filename)
        return url
    except Exception as e:
        logger.error("Error uploading image %s: %s", img.filename, e)
        return None

@app.route('/my-returns')
@login_required
def returns_page():
    returns = list(mongo.db.returns.find({"user_email": current_user.email}))
    for ret in returns:
        if "requested_at" in ret and ret["requested_at"]:
            ret["requested_at_formatted"] = ret["requested_at"].strftime("%Y-%m-%d")
        else:
            ret["requested_at_formatted"] = ""
    return render_template('returns_page.html', returns=returns)

@app.route('/check_return_eligibility/<order_no>')
@login_required
def check_return_eligibility(order_no):
    order = mongo.db.orders.find_one({"order_no": order_no, "user_email": current_user.email})
    if not order:
        return jsonify({"eligible": False, "message": "Order ID not found."})
    if order.get("order_status", "").lower() != "delivered":
        return jsonify({"eligible": False, "message": "Only delivered orders can be returned."})
    
    order_arrival_date = order.get("order_arrival_date") or order.get("transaction_date")
    if not order_arrival_date:
        return jsonify({"eligible": False, "message": "Order arrival date is unknown."})
    
    today = datetime.datetime.utcnow().date()

    arrival_date = order_arrival_date.date() if isinstance(order_arrival_date, datetime.datetime) else order_arrival_date
    
    if (today - arrival_date).days > 3:
        return jsonify({"eligible": False, 
                        "message": "Return not allowed: More than 3 days have passed which is against our item return policy. For more info, please contact us on WhatsApp."})
    return jsonify({"eligible": True, "message": "Order eligible for return."})

@app.route('/submit_return', methods=['POST'])
@login_required
def submit_return():
    order_id = request.form.get('orderId', '').strip()
    return_reason = request.form.get('reason', '').strip()
    if not order_id or not return_reason:
        return jsonify({"status": "error", "message": "Order ID and return reason are required."}), 400

    order = mongo.db.orders.find_one({"order_id": order_id, "user_email": current_user.email})
    if not order:
        return jsonify({"status": "error", "message": "Order ID not found."}), 404
    if order.get("order_status", "").lower() != "delivered":
        return jsonify({"status": "error", "message": "Only delivered orders can be returned."}), 400

    order_arrival_date = order.get("order_arrival_date") or order.get("transaction_date")
    if not order_arrival_date:
        return jsonify({"status": "error", "message": "Order arrival date is unknown."}), 400

    today = datetime.datetime.utcnow().date()
    arrival_date = order_arrival_date.date() if isinstance(order_arrival_date, datetime.datetime) else order_arrival_date
    if (today - arrival_date).days > 3:
        return jsonify({"status": "error", 
                        "message": "Return not allowed: More than 3 days have passed which is against our item return policy."}), 400

    # Retrieve files from the form
    images = request.files.getlist("imageUpload")
    video = request.files.get("videoUpload")
    if len(images) < 3:
        return jsonify({"status": "error", "message": "Please upload at least 3 images."}), 400
    if not video:
        return jsonify({"status": "error", "message": "Please upload a product video."}), 400

    saved_image_urls = []
    # Use ThreadPoolExecutor to upload images concurrently
    with ThreadPoolExecutor() as executor:
        futures = {executor.submit(upload_image_async, img): img for img in images if img and allowed_file(img.filename)}
        for future in as_completed(futures):
            url = future.result()
            if url is None:
                logger.error("One of the image uploads failed.")
                return jsonify({"status": "error", "message": "Error uploading one or more images."}), 500
            saved_image_urls.append(url)
    
    # Upload video synchronously (using resource_type="video")
    try:
        video_upload_result = cloudinary.uploader.upload(video, resource_type="video")
        video_secure_url = video_upload_result.get("secure_url")
        if not video_secure_url:
            logger.error("Cloudinary did not return secure_url for video: %s", video.filename)
            return jsonify({"status": "error", "message": "Error uploading video."}), 500
    except Exception as e:
        logger.error("Error uploading video %s: %s", video.filename, e)
        return jsonify({"status": "error", "message": "Error uploading video."}), 500

    return_doc = {
        "return_reason": return_reason,
        "requested_at": datetime.datetime.utcnow(),
        "items": order.get("product_names", []),
        "refund_status": "Pending",
        "tracking_id": order_id,
        "images": saved_image_urls,    # List of Cloudinary image URLs
        "videos": [video_secure_url],  # List with one Cloudinary video URL
        "user_email": current_user.email
    }
    mongo.db.returns.insert_one(return_doc)
    return jsonify({"status": "success", "message": "Your return request has been submitted successfully!"})




# Helper: Validate Pakistani phone number
def valid_phone_number(phone):
    return re.match(r"^03\d{9}$", phone)

# --- Update Delivery Info via AJAX ---
@app.route('/update_delivery_info', methods=["POST"])
@login_required
def update_delivery_info():
    user_email = current_user.email
    full_name = request.form.get("fullName", "").strip()
    phone_number = request.form.get("phoneNumber", "").strip()
    building = request.form.get("building", "").strip()
    colony = request.form.get("colony", "").strip()
    province = request.form.get("province", "").strip()
    city = request.form.get("city", "").strip()
    area = request.form.get("area", "").strip()
    address = request.form.get("address", "").strip()
    effective_delivery = request.form.get("effective_delivery", "").strip()
    contact_email = request.form.get("contact_email", "").strip() or current_user.email


    if not (full_name and phone_number and building and colony and province and city and area and address):
        return jsonify({"success": False, "message": "Please fill in all required delivery fields."}), 400
    if not valid_phone_number(phone_number):
        return jsonify({"success": False, "message": "Please enter a valid Pakistani phone number."}), 400

    record = {
        "user_email": user_email,
        "full_name": full_name,
        "phone_number": phone_number,
        "building": building,
        "colony": colony,
        "province": province,
        "city": city,
        "area": area,
        "address": address,
        "effective_delivery": effective_delivery,
        "contact_email": contact_email
    }
    mongo.db.del_info.update_one({"user_email": user_email}, {"$set": record}, upsert=True)
    return jsonify({"success": True, "message": "Delivery information updated successfully!"})

# --- Coupon Application Endpoint (Single Product Discount) ---
@app.route('/apply_coupon', methods=["POST"])
@login_required
def apply_coupon():
    coupon_code = request.form.get("couponCode", "").strip()
    coupon = mongo.db.coupons.find_one({"couponCode": coupon_code})
    if not coupon:
        return jsonify({"success": False, "message": "Invalid coupon code."})
    discount_percent = coupon.get("discountPercent", 0)

    # Check if a product_id is provided (Buy Now scenario)
    product_id = request.form.get("product_id")
    if product_id:
        product = mongo.db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"success": False, "message": "Product not found."})
        product_price = float(product.get("discountedPrice", 0))
        if product_price < 2000:
            return jsonify({"success": False, "message": "Product price must exceed 2000 PKR for coupon application."})
        discount_amount = product_price * discount_percent / 100
        new_total = product_price - discount_amount
        return jsonify({
            "success": True,
            "message": f"Coupon applied! You get {discount_percent}% discount.",
            "discount_amount": discount_amount,
            "new_total": new_total
        })
    else:
        # Fallback: if not a Buy Now scenario, you might process the entire cart.
        user_email = current_user.email
        cart_items = list(mongo.db.cart.find({"user_email": user_email}))
        item_total = sum(float(item.get("price", 0)) * int(item.get("quantity", 1)) for item in cart_items)
        if item_total < 2000:
            return jsonify({
                "success": False,
                "message": "Cart total must exceed 2000 PKR for coupon application."
            })
        discount_amount = item_total * discount_percent / 100
        new_total = item_total - discount_amount
        return jsonify({
            "success": True,
            "message": f"Coupon applied! You get {discount_percent}% discount.",
            "discount_amount": discount_amount,
            "new_total": new_total
        })



# --- Delivery/Promotion Page Endpoint ---
@app.route('/del_info_promo_page', methods=["GET", "POST"])
@login_required
def del_info_promo_page():
    user_email = current_user.email
    product_id = request.args.get("product_id")  # Optional for Buy Now scenario
    selected_ids = request.args.get("selected_ids")  # New argument for multi-product checkout

    if product_id:
        session["product_id"] = product_id

    # Process POST request (delivery info form submission)
    if request.method == "POST":
        full_name = request.form.get("fullName", "").strip()
        phone_number = request.form.get("phoneNumber", "").strip()
        building = request.form.get("building", "").strip()
        colony = request.form.get("colony", "").strip()
        province = request.form.get("province", "").strip()
        city = request.form.get("city", "").strip()
        area = request.form.get("area", "").strip()
        address = request.form.get("address", "").strip()
        effective_delivery = request.form.get("effective_delivery", "").strip()
        contact_email = request.form.get("contact_email", "").strip() or current_user.email

        if not (full_name and phone_number and building and colony and province and city and area and address):
            flash("Please fill in all required delivery fields.", "error")
            return redirect(url_for("del_info_promo_page", product_id=product_id))
        if not valid_phone_number(phone_number):
            flash("Please enter a valid Pakistani phone number.", "error")
            return redirect(url_for("del_info_promo_page", product_id=product_id))

        record = {
            "user_email": user_email,
            "full_name": full_name,
            "phone_number": phone_number,
            "building": building,
            "colony": colony,
            "province": province,
            "city": city,
            "area": area,
            "address": address,
            "effective_delivery": effective_delivery,
            "contact_email": contact_email
        }
        mongo.db.del_info.update_one({"user_email": user_email}, {"$set": record}, upsert=True)
        flash("Delivery information saved successfully!", "success")
        return redirect(url_for("del_info_promo_page", product_id=product_id))

    # GET: Pre-populate delivery info
    delivery_info = mongo.db.del_info.find_one({"user_email": user_email})
    main_details = mongo.db.main_details.find_one({})
    delivery_fee = main_details.get("deliveryFee", 200) if main_details else 200

    products = []
    item_total = 0
    total_quantity = 0
    grand_total = 0

    # New branch: if selected_ids is provided, parse and use it.
    if selected_ids:
        try:
            import json
            selected_products = json.loads(selected_ids)
            for item in selected_products:
                # Here we assume that each item already contains the necessary details,
                # but you could also retrieve additional data from the database if needed.
                products.append({
                    "_id": item.get("_id"),
                    "title": item.get("title", "No Title"),
                    "image": item.get("image", ""),
                    "productCategory": item.get("productCategory", "Uncategorized"),
                    "selected_color": item.get("selected_color", "N/A"),
                    "selected_size": item.get("selected_size", "N/A"),
                    "price": item.get("discountPrice", 0),
                    "originalprice": item.get("originalPrice", 0),
                    "discountpercent": item.get("discountPercent", 0),
                    "quantity": item.get("quantity", 1)
                })
        except Exception as e:
            flash("Invalid product selection data.", "error")
            return redirect(url_for("cart_page"))  # redirect to cart or an appropriate page

        # Calculate totals based on the selected products
        item_total = sum(float(p["price"]) * int(p["quantity"]) for p in products)
        total_quantity = sum(int(p["quantity"]) for p in products)
        grand_total = item_total + (delivery_fee * total_quantity)

    # Else: process Buy Now scenario or full cart checkout
    elif product_id:
        product = mongo.db.products.find_one({"_id": ObjectId(product_id)})
        if product:
            product["_id"] = str(product["_id"])

             # **NEW**: grab the selected color from the URL, fallback to first color
            selected_color = request.args.get("selected_color") \
                              or (product.get("colors", ["N/A"])[0] if product.get("colors") else "N/A")
            selected_size = request.args.get("selected_size") \
                              or (product.get("sizes", ["N/A"])[0] if product.get("sizes") else "N/A")
            selected_product = {
                "_id": product["_id"],
                "title": product["title"],
                "image": product.get("images", [""])[0],
                "productCategory": product.get("productCategory", "Uncategorized"),
                "selected_color": selected_color,
                "selected_size": selected_size,
                "price": product["discountedPrice"],
                "originalprice": product["originalPrice"],
                "discountpercent": product["discountPercent"],
                "quantity": 1
            }
            products = [selected_product]
        else:
            products = []
    else:
        # Full cart checkout: get the cart document for the user.
        cart_doc = mongo.db.cart.find_one({"user_email": user_email})
        if cart_doc and "products" in cart_doc:
            for item in cart_doc["products"]:
                prod = mongo.db.products.find_one({"_id": ObjectId(item["product_id"])}, 
                                                  {"title": 1, "images": 1, "productCategory": 1,
                                                   "discountedPrice": 1, "originalPrice": 1, "discountPercent": 1})
                if prod:
                    prod["_id"] = str(prod["_id"])
                    products.append({
                        "_id": prod["_id"],
                        "title": prod.get("title", "No Title"),
                        "image": prod.get("images", [""])[0],
                        "productCategory": prod.get("productCategory", "Uncategorized"),
                        "selected_color": item.get("selected_color", "N/A"),
                        "selected_size": item.get("selected_size", "N/A"),
                        "price": prod.get("discountedPrice", 0),
                        "originalprice": prod.get("originalPrice", 0),
                        "discountpercent": prod.get("discountPercent", 0),
                        "quantity": item.get("quantity", 1)
                    })
        else:
            products = []

        # Calculate totals based on the full cart
        item_total = sum(float(p["price"]) * int(p["quantity"]) for p in products)
        total_quantity = sum(int(p["quantity"]) for p in products)
        grand_total = item_total + (delivery_fee * total_quantity)

    return render_template("del_info_promo_page.html",
                           delivery_info=delivery_info,
                           delivery_fee=delivery_fee,
                           grand_total=grand_total,
                           item_total=item_total,
                           quantity=total_quantity,
                           products=products)




@app.route('/get_cities', methods=['POST'])
def get_cities():
    """
    Accepts JSON {"state": "Punjab"} and returns the same
    response as the external countriesnow API, but via Flask.
    """
    payload = request.get_json()
    # optionally validate payload['state'] here
    try:
        resp = requests.post(
            'https://countriesnow.space/api/v0.1/countries/state/cities',
            json={'country': 'Pakistan', 'state': payload.get('state')}
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        # on error, return a safe JSON shape
        return jsonify({'error': True, 'msg': str(e), 'data': []}), 500



def preprocess_image_for_ocr(image):
    """
    Preprocesses the image to enhance white text on colored backgrounds.
    Converts image to grayscale, boosts contrast, and applies thresholding.
    """
    # Convert to grayscale
    gray = image.convert('L')
    
    # Enhance contrast (increase factor as needed)
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(2.5)  # Adjust factor based on your images
    
    # Optionally, invert image if you need dark text on a light background.
    # Uncomment the next two lines if necessary.
    # inverted = ImageOps.invert(enhanced)
    # enhanced = inverted
    
    # Apply thresholding to get a binary image
    threshold = 200  # Adjust this threshold value as needed
    bw = enhanced.point(lambda x: 0 if x < threshold else 255, '1')
    return bw

import cv2
import numpy as np
from PIL import Image

def preprocess_white_text_on_orange(image: Image.Image) -> Image.Image:
    """
    Attempts to isolate and enhance white text on an orange background for SadaPay screenshots.
    Steps:
      1. Convert PIL image to OpenCV (BGR).
      2. Convert to HSV and create a mask for orange areas.
      3. Invert those areas so white text becomes black.
      4. Convert to grayscale, apply threshold to get crisp text.
      5. Convert back to PIL image for Tesseract.
    """
    open_cv_image = np.array(image.convert('RGB'))[..., ::-1]  # Convert PIL->CV2 (RGB->BGR)

    # Convert to HSV
    hsv = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2HSV)

    # Approx. orange color range in HSV space (tweak as needed)
    lower_orange = np.array([5, 100, 100], dtype=np.uint8)
    upper_orange = np.array([25, 255, 255], dtype=np.uint8)

    # Create mask for orange areas
    mask = cv2.inRange(hsv, lower_orange, upper_orange)

    # Invert only the orange regions
    inverted = cv2.bitwise_not(open_cv_image)  
    result = open_cv_image.copy()
    result[mask > 0] = inverted[mask > 0]

    # Convert to grayscale
    gray = cv2.cvtColor(result, cv2.COLOR_BGR2GRAY)

    # Apply threshold (adjust threshold value to your images)
    _, thresh = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)

    # Convert back to PIL
    processed_pil = Image.fromarray(thresh)
    return processed_pil




mail = Mail(app)



@app.route("/pay", methods=["GET"])
@login_required
def pay_page():
    """Render Payment Page with order summary from session.
       Also fetch the COD fee from the main_details collection.
    """
    order_summary = session.get("order_summary", {})
    cod_record = mongo.db.main_details.find_one({}, {"codfee": 1})
    codfee = cod_record.get("codfee", 50) if cod_record else 50
    return render_template("pay_page.html", order_summary=order_summary, codfee=codfee)

# Helper function for Direct Bank label
def get_direct_bank_label():
    bank_selection = request.form.get("bank_selection", "").lower()
    if bank_selection == "ubl":
        return "Direct Bank (UBL)"
    elif bank_selection == "meezan":
        return "Direct Bank (Meezan)"
    else:
        return "Direct Bank"

# Preprocessing functions
def preprocess_white_text_on_orange(image: Image.Image) -> Image.Image:
    import cv2
    import numpy as np
    open_cv_image = np.array(image.convert('RGB'))[..., ::-1]  # PIL->CV2 (BGR)
    hsv = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2HSV)
    lower_orange = np.array([5, 100, 100], dtype=np.uint8)
    upper_orange = np.array([25, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower_orange, upper_orange)
    inverted = cv2.bitwise_not(open_cv_image)
    result = open_cv_image.copy()
    result[mask > 0] = inverted[mask > 0]
    gray = cv2.cvtColor(result, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 140, 255, cv2.THRESH_BINARY)
    return Image.fromarray(thresh)

def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    # Example preprocessing: convert to grayscale and enhance contrast
    from PIL import ImageEnhance
    gray = image.convert('L')
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(2.0)
    processed = enhanced.point(lambda x: 0 if x < 150 else 255, '1')
    return processed

# Function to extract the prominent amount (using currency markers and bounding box size)
def get_prominent_amount(image):
    config = '--oem 3 --psm 6'
    data = pytesseract.image_to_data(image, config=config, output_type=Output.DICT)
    n_boxes = len(data['level'])
    candidate = None
    candidate_height = 0
    # Group words by line using (block_num, par_num, line_num)
    lines = {}
    for i in range(n_boxes):
        key = (data['block_num'][i], data['par_num'][i], data['line_num'][i])
        lines.setdefault(key, []).append(i)
    for key, indices in lines.items():
        line_text = " ".join([data['text'][i] for i in indices]).lower()
        if "rs" in line_text or "pkr" in line_text:
            for i in indices:
                word = data['text'][i].strip()
                if not word:
                    continue
                if re.search(r'\d', word):
                    height = int(data['height'][i])
                    if height > candidate_height:
                        candidate = word
                        candidate_height = height
    if not candidate:
        for i in range(n_boxes):
            word = data['text'][i].strip()
            if word and re.search(r'\d', word):
                height = int(data['height'][i])
                if height > candidate_height:
                    candidate = word
                    candidate_height = height
    return candidate


def get_current_product_data(user_email):
    """
    Returns a tuple (current_product_ids, current_product_names) as arrays.
    Priority is given in the following order:
      1. If session['selected_ids'] exists, returns those products.
      2. If session['product_id'] exists, returns that single product.
      3. Otherwise, fetches the cart document for the user and extracts all product details.
    """
    # Check if multi-product selection exists in session.
    

    selected_products = session.get("selected_ids")
    app.logger.info("Session data at get_current_product_data: %s", dict(session))
    if selected_products:
        app.logger.info("Found multi-product selection in session: %s", selected_products)
        current_product_ids = []
        current_product_names = []
        for item in selected_products:
            prod_id = item.get("_id")
            prod_title = item.get("title", "N/A")
            if prod_id:
                current_product_ids.append(prod_id)
                current_product_names.append(prod_title)
        return current_product_ids, current_product_names

    # Fall back to single product (Buy Now scenario)
    product_id = session.get("product_id")
    if product_id:
        product_doc = mongo.db.products.find_one({"_id": ObjectId(product_id)}, {"title": 1})
        current_product_ids = [product_id]
        current_product_names = [product_doc["title"] if product_doc and "title" in product_doc else "N/A"]
        return current_product_ids, current_product_names

    # Fall back to full cart checkout.
    cart_doc = mongo.db.cart.find_one({"user_email": user_email})
    current_product_ids = []
    current_product_names = []
    if cart_doc:
        products_list = cart_doc.get("products", [])
        for product in products_list:
            prod_id = product.get("product_id")
            if prod_id:
                prod_doc = mongo.db.products.find_one({"_id": ObjectId(prod_id)}, {"title": 1})
                if prod_doc:
                    current_product_ids.append(prod_id)
                    current_product_names.append(prod_doc.get("title", "N/A"))
    return current_product_ids, current_product_names



def get_next_order_no():
    """
    Atomically increments a counter in 'counters' and returns
    first‐last#NN (or NNN once past 99). Starts numbering at 10.
    """
    counter = mongo.db.counters.find_one_and_update(
        {"_id": "order_no"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    # raw seq starts at 1 → numeric = seq + 9 → first is 10, then 11… 99,100,...
    num = counter["seq"] + 9
    # get delivery‐info full name (we’ll uppercase its ends later)
    return num


@app.route("/process_payment", methods=["POST"])
@login_required
def process_payment():
    """
    Process payment verification for both digital and COD methods.
    """
    payment_method = request.form.get("payment_method", "").lower()
    if not payment_method:
        return jsonify({"status": "error", "message": "Payment method not provided."})

    user_email = session.get("user_email")
    order_summary = session.get("order_summary", {})
    if not order_summary:
        app.logger.error("Missing order summary for user: %s", user_email)
        return jsonify({"status": "error", "message": "Order details missing. Please try again."}), 400

    # --- Helper: fetch current product(s) with their selections ---
    def get_current_product_data(user_email):
        ids, names, colors, sizes, quantities = [], [], [], [], []
        selected_products = session.get("selected_ids")
        if selected_products:
            for item in selected_products:
                pid = item.get("_id")
                if pid:
                    ids.append(pid)
                    names.append(item.get("title", "N/A"))
                    colors.append(item.get("selected_color", "N/A"))
                    sizes.append(item.get("selected_size", "N/A"))
                    quantities.append(item.get("quantity", 1))
            return ids, names, colors, sizes, quantities

        product_id = session.get("product_id")
        if product_id:
            prod = mongo.db.products.find_one({"_id": ObjectId(product_id)}, {"title": 1})
            ids = [product_id]
            names = [prod.get("title", "N/A")] if prod else ["N/A"]
            colors = [order_summary.get("selected_color", "N/A")]
            sizes = [order_summary.get("selected_size", "N/A")]
            quantities = [order_summary.get("quantity", 1)]
            return ids, names, colors,sizes, quantities

        cart = mongo.db.cart.find_one({"user_email": user_email})
        if cart:
            for entry in cart.get("products", []):
                pid = entry.get("product_id")
                if pid:
                    doc = mongo.db.products.find_one({"_id": ObjectId(pid)}, {"title": 1})
                    ids.append(pid)
                    names.append(doc.get("title", "N/A") if doc else "N/A")
                    colors.append(entry.get("selected_color", "N/A"))
                    sizes.append(entry.get("selected_size", "N/A"))
                    quantities.append(entry.get("quantity", 1))
            return ids, names, colors,sizes, quantities

        return [], [], [], [], []

    # Fetch common data for both branches
    ids, names, colors,sizes, quantities = get_current_product_data(user_email)
    customer = mongo.db.del_info.find_one(
        {"user_email": user_email},
        {"full_name": 1, "address": 1, "province": 1, "phone_number": 1}
    ) or {}
    raw_name = customer.get("full_name", "N/A").strip()
    # Uppercase letters and fallback
    first_char = raw_name[0].upper() if raw_name else "X"
    last_char = raw_name[-1].upper() if raw_name else "X"
    seq_num = get_next_order_no()
    order_no = f"{first_char}#{last_char}{seq_num}"

    # --- COD branch ---
    if payment_method == "cod":
        cod_record = mongo.db.main_details.find_one({}, {"codfee": 1})
        cod_fee = cod_record.get("codfee", 50) if cod_record else 50

        qty = order_summary.get("quantity", 1)
        grand_total = float(order_summary.get("grand_total", 0))
        total_payment = grand_total + (cod_fee * qty)

        # Record payment
        mongo.db.payments.insert_one({
            "user_email": user_email,
            "payment_method": "COD",
            "amount": total_payment,
            "status": "Pending",
            "COD": cod_fee,
            "pay_date": datetime.datetime.utcnow(),
            "screenshot": None
        })

        # Insert the order with order_no
        mongo.db.orders.insert_one({
            "order_no": order_no,
            "order_id": str(ObjectId()),
            "user_email": user_email,
            "product_ids": ids,
            "product_names": names,
            "product_colors": colors,
            "product_sizes": sizes,
            "product_quantities": quantities,
            "customer_name": raw_name,
            "address": customer.get("address", "N/A"),
            "province": customer.get("province", "N/A"),
            "phone_number": customer.get("phone_number", "N/A"),
            "payment_method": "COD",
            "payment_amount": total_payment,
            "order_status": "Pending",
            "transaction_date": datetime.datetime.utcnow()
        })

        # Clear session keys
        for key in ("selected_ids", "order_summary", "product_id"): session.pop(key, None)

        return jsonify({
            "status": "success",
            "message": f"Cash on Delivery selected. Please be ready with Rs. {total_payment} at delivery."
        })

    # --- Digital payment branch ---
    if "payment_screenshot" not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded."})
    file = request.files["payment_screenshot"]
    if not file.filename:
        return jsonify({"status": "error", "message": "Invalid file name."})
    file_bytes = file.read()

    try:
        original = Image.open(io.BytesIO(file_bytes))
        processed = (
            preprocess_white_text_on_orange(original)
            if payment_method == "sadapay"
            else preprocess_image_for_ocr(original)
        )
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error processing image: {e}"})

    extracted_amount_str = get_prominent_amount(processed) or ""
    expected_amount = order_summary.get("grand_total", 0)

    # Compare amounts
    def normalize_amount(txt): return re.sub(r"[^0-9.]", "", txt)
    int_ext = normalize_amount(extracted_amount_str).split('.',1)[0]
    int_exp = normalize_amount(str(expected_amount)).split('.',1)[0]

    errors = []
    full_text = pytesseract.image_to_string(processed, config='--oem 3 --psm 6')
    if "Muhammad Akasha" not in full_text:
        errors.append("Account name mismatch.")
    if int_ext != int_exp:
        errors.append(f"Amount mismatch. Expected: Rs.{int_exp} Found: Rs.{int_ext}")

    if errors:
        mongo.db.payments.insert_one({
            "user_email": user_email,
            "payment_method": get_direct_bank_label() if payment_method == "direct_bank" else payment_method.capitalize(),
            "amount": 0,
            "status": "Verification Failed: " + " ".join(errors),
            "COD": "N/A",
            "pay_date": datetime.datetime.utcnow(),
            "screenshot": Binary(file_bytes)
        })
        return jsonify({"status": "error", "message": " ".join(errors)})

    # Successful digital payment
    method_label = get_direct_bank_label() if payment_method == "direct_bank" else payment_method.capitalize()
    mongo.db.payments.insert_one({
        "user_email": user_email,
        "payment_method": method_label,
        "amount": expected_amount,
        "status": "Paid",
        "COD": "N/A",
        "pay_date": datetime.datetime.utcnow(),
        "screenshot": Binary(file_bytes)
    })

    mongo.db.orders.insert_one({
        "order_no": order_no,
        "order_id": str(ObjectId()),
        "user_email": user_email,
        "product_ids": ids,
        "product_names": names,
        "product_colors": colors,
        "product_sizes": sizes,
        "product_quantities": quantities,
        "customer_name": raw_name,
        "address": customer.get("address", "N/A"),
        "province": customer.get("province", "N/A"),
        "phone_number": customer.get("phone_number", "N/A"),
        "payment_method": method_label,
        "payment_amount": expected_amount,
        "order_status": "Processing",
        "transaction_date": datetime.datetime.utcnow()
    })

    return jsonify({"status": "success", "message": "Payment verified successfully!"})


@app.route("/redirect_to_pay", methods=["POST"])
@login_required
def redirect_to_pay():
    data = request.json
    app.logger.debug("🔥🔥🔥redirect_to_pay received JSON: %s", data)
    session["order_summary"] = data.get("order_summary", {})
    session["user_email"]   = data.get("user_email", "")

    # Multi‑product
    selected = data.get("selected_ids")
    app.logger.debug("Storing selected_ids in session: %s", selected)
    if selected:
        session["selected_ids"] = selected

    # Single‑product buy‑now
    # Always pull these keys if they’re in the payload:
    if data.get("selected_color"):
        session["order_summary"]["selected_color"] = data["selected_color"]
    if data.get("selected_size"):
        session["order_summary"]["selected_size"] = data["selected_size"]
    if data.get("quantity"):
        session["order_summary"]["quantity"] = data["quantity"]

    return jsonify({"status": "success", "redirect_url": url_for("pay_page")})





@app.context_processor
def inject_cart_count():
    from flask_login import current_user
    if current_user.is_authenticated:
        cart_doc = mongo.db.cart.find_one({"user_email": current_user.email})
        count = 0
        if cart_doc and "products" in cart_doc:
            for prod in cart_doc["products"]:
                count += int(prod.get("quantity", 0))
        return dict(cart_count=count)
    return dict(cart_count=0)




@app.route('/cart')
@login_required
def cart():
    user_email = current_user.email
    # Find the single cart document for the user
    cart_doc = mongo.db.cart.find_one({"user_email": user_email})
    products = []
    if cart_doc and "products" in cart_doc:
        for item in cart_doc["products"]:
            prod = mongo.db.products.find_one(
                {"_id": ObjectId(item["product_id"])},
                {
                    "title": 1,
                    "images": 1,
                    "productCategory": 1,
                    "discountedPrice": 1,
                    "originalPrice": 1,
                    "discountPercent": 1,
                    "brand": 1
                }
            )
            if prod:
                prod["_id"] = str(prod["_id"])
                products.append({
                    "_id": prod["_id"],
                    "title": prod.get("title", "No Title"),
                    "image": prod.get("images", [""])[0],
                    "productCategory": prod.get("productCategory", "Uncategorized"),
                    "brand": prod.get("brand", "N/A"),
                    "selected_color": item.get("selected_color", "N/A"),
                    "selected_size": item.get("selected_size", "N/A"),
                    "discountPrice": float(prod.get("discountedPrice", 0)),
                    "originalPrice": float(prod.get("originalPrice", 0)),
                    "discountPercent": prod.get("discountPercent", 0),
                    "quantity": int(item.get("quantity", 1)),
                    "selected": item.get("selected", False)
                })
    else:
        products = []

    # Fetch deliveryFee from main_details.
    main_details = mongo.db.main_details.find_one({})
    deliveryFee = float(main_details.get("deliveryFee", 0)) if main_details else 0

    # Calculate totals.
    item_total = sum(p["discountPrice"] * p["quantity"] for p in products)
    total_quantity = sum(p["quantity"] for p in products)
    shipping_fee = deliveryFee * total_quantity
    grand_total = item_total + shipping_fee

    cart_data = {
        "products": products,
        "item_total": item_total,
        "total_quantity": total_quantity,
        "shipping_fee": shipping_fee,
        "grand_total": grand_total,
        "user_email": user_email,
        "deliveryFee": deliveryFee
    }
    
    return render_template("cart.html", cart_data=cart_data)


@app.route('/cart-count')
@login_required
def cart_count():
    user_email = current_user.email
    cart_doc = mongo.db.cart.find_one(
        {"user_email": user_email},
        {"products.quantity": 1}  # Only retrieve quantity data
    )
    total_quantity = 0
    if cart_doc and "products" in cart_doc:
        total_quantity = sum(item.get("quantity", 1) for item in cart_doc["products"])
    return jsonify({"count": total_quantity})  



@app.route('/order_placed')
@login_required
def order_placed():
    """
    1) Fetch most recent order for current_user
    2) Send styled HTML+text emails to Admin & Customer
    3) Render confirmation page
    """
    user_email = current_user.email
    now = datetime.datetime.utcnow()

    # ─── 1) Load most recent order ──────────────────────────────────────────────
    order_doc = mongo.db.orders.find_one(
        {"user_email": user_email},
        sort=[("transaction_date", -1)]
    )
    if not order_doc:
        return "No order found", 404

    # ─── 2) Extract & prepare data ──────────────────────────────────────────────
    order_no       = order_doc.get("order_no", "N/A")
    payment_amount = order_doc.get("payment_amount", 0)
    shipping_addr  = order_doc.get("address", "N/A").replace("\n", "<br>")
    order_status   = order_doc.get("order_status", "Processing")

    # Pull arrays from the order document
    p_ids       = order_doc.get("product_ids", [])
    p_names     = order_doc.get("product_names", [])
    p_colors    = order_doc.get("product_colors", [])
    p_sizes    = order_doc.get("product_sizes", [])
    p_quantities= order_doc.get("product_quantities", [])

    # Helper to fetch price & image
    def fetch_item(pid, pname):
        prod = mongo.db.products.find_one(
            {"_id": ObjectId(pid)},
            {"discountedPrice": 1, "images": 1}
        )
        price     = prod.get("discountedPrice", "N/A") if prod else "N/A"
        imgs      = prod.get("images", []) if prod else []
        image_url = imgs[0] if imgs else url_for('static', filename='img/1.webp')
        return {"name": pname, "price": price, "image_url": image_url}

    # Build enriched items list
    items = []
    for pid, pname, color, size, qty in zip(p_ids, p_names, p_colors, p_sizes, p_quantities):
        item = fetch_item(pid, pname)
        item.update({"color": color, "size": size, "quantity": qty})
        items.append(item)

    # Estimated delivery window
    today = datetime.date.today()
    start = today + datetime.timedelta(days=random.randint(3, 5))
    end   = today + datetime.timedelta(days=random.randint(6, 7))
    estimated_delivery = f"Est. {start.strftime('%d %b')} – {end.strftime('%d %b')}"

    # Plain‑text & HTML product lists
    product_list_txt = "\n".join(
        f"- {it['name']} (Qty: {it['quantity']}, Color: {it['color']}, Size: {it['size']}, Rs. {it['price']})"
        for it in items
    ) or "N/A"
    product_list_html = "<br>".join(
        f"{it['name']} — Qty: {it['quantity']}, Color: {it['color']}, Size: {it['size']}, Rs. {it['price']}"
        for it in items
    ) or "N/A"

    # WhatsApp tracking link
    wa_text = f"Hello ShopKhana, I would like to track my order (Order ID: {order_no})."
    wa_url  = "https://wa.me/923098245609?" + urlencode({'text': wa_text})

    # Shared context for template
    order_details = {
        "order_id":           order_no,
        "payment_amount":     payment_amount,
        "items":              items,
        "estimated_delivery": estimated_delivery,
        "user_email":         user_email,
        "shipping_address":   shipping_addr.replace("<br>", "\n"),
        "order_status":       order_status,
    }

    # ─── 3A) Send Styled Email → Admin ─────────────────────────────────────────
    admin_msg = Message(
        subject="🚨 Payment Alert - ShopKhana",
        sender=app.config["MAIL_DEFAULT_SENDER"],
        recipients=["info.shopkhana@gmail.com"]
    )
    # Plain-text
    admin_msg.body = f"""Dear Admin,

A new order has been placed on ShopKhana.

Order ID: {order_no}
User Email: {user_email}
Payment Method: {order_doc.get('payment_method','N/A')}
Payment Amount: Rs. {payment_amount}
Transaction Date: {now.strftime('%d-%m-%Y')}
Transaction Time: {now.strftime('%I:%M %p')}

Products:
{product_list_txt}

Please process and dispatch ASAP.

Thank you,
ShopKhana Team
"""
    # HTML
    admin_msg.html = f"""<html><body style="font-family:Arial,sans-serif; background:#f7f7f7; margin:0; padding:20px;">
  <table align="center" width="600" cellpadding="0" cellspacing="0"
         style="background:#ffffff; border:2px solid #FFA726; border-radius:8px;">
    <tr><td style="background:#FFF3E0; padding:20px; text-align:center;">
      <h2 style="margin:0; color:#FB8C00;">🚨 New Order Alert</h2>
    </td></tr>
    <tr><td style="padding:20px; color:#333;">
      <strong>Order ID:</strong> {order_no}<br>
      <strong>User Email:</strong> {user_email}<br>
      <strong>Payment Method:</strong> {order_doc.get('payment_method','N/A')}<br>
      <strong>Payment Amount:</strong> Rs. {payment_amount}<br>
      <strong>Date:</strong> {now.strftime('%d-%m-%Y')} at {now.strftime('%I:%M %p')}
    </td></tr>
    <tr><td style="padding:0 20px 20px;">
      <table width="100%" cellpadding="8" cellspacing="0"
             style="border:1px solid #FFECB3; border-collapse:collapse;">
        <tr style="background:#FFF8E1; color:#E65100; font-weight:bold;">
          <td>Product</td><td>Qty</td><td>Color</td><td>Size</td><td>Price</td>
        </tr>
        {''.join(f"""
        <tr>
          <td>{it['name']}</td>
          <td>{it['quantity']}</td>
          <td>{it['color']}</td>
          <td>{it['size']}</td>
          <td>Rs. {it['price']}</td>
        </tr>""" for it in items)}
      </table>
    </td></tr>
    <tr><td style="padding:20px; color:#333;">
      Please process and dispatch ASAP.<br><br>
      <span style="color:#FB8C00; font-weight:bold;">ShopKhana Team</span>
    </td></tr>
  </table>
</body></html>"""
    admin_msg.content_subtype = "html"
    mail.send(admin_msg)

    # ─── 3B) Send Engaging Email → Customer ──────────────────────────────────────
    cust_msg = Message(
        subject="🛒 Your ShopKhana Order Confirmation",
        sender=app.config["MAIL_DEFAULT_SENDER"],
        recipients=[user_email]
    )
    # Plain-text
    cust_msg.body = f"""Dear {current_user.name or user_email},

Thank you for shopping with ShopKhana!

Order ID: {order_no}
Status: {order_status}

Products:
{product_list_txt}

Total Amount: Rs. {payment_amount}
Payment Method: {order_doc.get('payment_method','N/A')}
Estimated Delivery: {estimated_delivery}

Shipping Address:
{order_details['shipping_address']}

View Order: https://shopkhana.pk/my-orders
Track via WhatsApp: {wa_url}

Warm regards,
ShopKhana Team
"""
    # HTML
    cust_msg.html = f"""<html><body style="font-family:Segoe UI, sans-serif; background:#fffbe6; margin:0; padding:20px;">
  <table align="center" width="600" style="background:#ffffff; border:2px solid #FFA726; border-radius:8px;">
    <tr><td style="background:#FFF3E0; text-align:center; padding:25px;">
      <h2 style="margin:0; color:#FB8C00;">🛒 Your ShopKhana Order Confirmation</h2>
    </td></tr>
    <tr><td style="padding:20px; color:#333;">
      Dear {current_user.name or user_email},<br><br>
      Your order has been placed successfully!
    </td></tr>
    <tr><td style="padding:10px 20px; background:#FFF8E1; color:#E65100; font-weight:bold;">
      Order Summary
    </td></tr>
    <tr><td style="padding:10px 20px; color:#333; border-bottom:1px solid #FFECB3;">
      <strong>Order ID:</strong> {order_no}<br>
      <strong>Product(s): </strong><br>
      {"".join(f"{it['name']} — Qty: {it['quantity']}, Color: {it['color']},  Size: {it['size']}<br>" for it in items)}
      <strong>Total:</strong> Rs. {payment_amount}<br>
      <strong>Estimated Delivery:</strong> {estimated_delivery}
    </td></tr>
    <tr><td style="padding:10px 20px; background:#FFF8E1; color:#E65100; font-weight:bold;">
      Shipping Address
    </td></tr>
    <tr><td style="padding:10px 20px; color:#333; border-bottom:1px solid #FFECB3;">
      {shipping_addr}
    </td></tr>
    <tr><td style="padding:30px; text-align:center;">
      <a href="https://shopkhana.pk/my-orders" style="display:inline-block; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; background:linear-gradient(135deg,#FFA726,#FFB300); color:#fff;">
        View Order
      </a>
      <a href="{wa_url}" style="display:inline-block; padding:14px 28px; text-decoration:none; border-radius:6px; font-weight:bold; background:linear-gradient(135deg,#FDD835,#FBC02D); color:#333; margin-left:10px;">
        Track via WhatsApp
      </a>
    </td></tr>
    <tr><td style="padding:20px; color:#444;">
      You’ll get another email when your order ships.<br><br>
      Thanks for choosing <strong>ShopKhana</strong>!<br>
      <span style="color:#FB8C00; font-weight:bold;">ShopKhana Team</span>
    </td></tr>
  </table>
</body></html>"""
    cust_msg.content_subtype = "html"
    mail.send(cust_msg)

    # ─── 4) Render confirmation page ────────────────────────────────────────────
    return render_template("order_placed.html", order_details=order_details)


# My Orders Page: Fetch orders for the current user with pagination and sorting.
@app.route('/my-orders')
@login_required
def my_orders():
    user_email = current_user.email
    page = int(request.args.get('page', 1))
    per_page = 10
    sort_order = request.args.get("sort", "newest")  # "newest" or "oldest"
    sort_direction = -1 if sort_order == "newest" else 1

    total_orders = mongo.db.orders.count_documents({"user_email": user_email})
    total_pages = math.ceil(total_orders / per_page)

    orders_cursor = mongo.db.orders.find({"user_email": user_email}).sort("transaction_date", sort_direction)\
                        .skip((page - 1) * per_page).limit(per_page)
    orders = []
    for order in orders_cursor:
        order["_id"] = str(order["_id"])
        # Generate a simple random 6-digit order number for display.
        order["display_order_number"] = str(random.randint(100000, 999999))
        if "transaction_date" in order and order["transaction_date"]:
            order["transaction_date_formatted"] = order["transaction_date"].strftime("%Y-%m-%d %H:%M")
        else:
            order["transaction_date_formatted"] = ""
        orders.append(order)

    pagination = {
        "current_page": page,
        "total_pages": total_pages,
        "per_page": per_page,
        "total_orders": total_orders
    }
    return render_template("myorders.html", orders=orders, pagination=pagination, sort_order=sort_order)

# Track Shipment: Redirect to WhatsApp with a message using the actual order_id.
@app.route('/track_shipment/<order_id>')
@login_required
def track_shipment(order_no):
    message = f"Order {order_no}: You can track your order status on WhatsApp!"
    whatsapp_number = "+923098245609"
    url = f"https://wa.me/{whatsapp_number}?text={message}"
    return redirect(url)


@app.route('/download_invoice/<order_id>')
@login_required
def download_invoice(order_no):
    # Fetch order
    order = mongo.db.orders.find_one({
        "order_no": order_no,
        "user_email": current_user.email
    })
    if not order:
        return "Order not found", 404

    # Prepare a BytesIO buffer for the PDF
    buffer = io.BytesIO()
    # Create the PDF object, using A4 page size
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Draw text lines
    x_margin = 50
    y = height - 50
    line_height = 18

    def draw_line(text, indent=0):
        nonlocal y
        p.drawString(x_margin + indent, y, text)
        y -= line_height

    # Header
    draw_line(f"Invoice for Order #{order.get('display_order_number', order_no)}")
    y -= line_height  # extra space

    # Customer details
    draw_line(f"Customer Name: {order.get('customer_name', 'N/A')}")
    draw_line(f"Phone: {order.get('phone_number', 'N/A')}")
    draw_line(f"Shipping Address: {order.get('address', '')}, {order.get('province', '')}")
    draw_line(f"Payment Method: {order.get('payment_method', 'N/A')}")
    draw_line(f"Order Status: {order.get('order_status', 'N/A')}")
    txn = order.get('transaction_date')
    txn_str = txn.strftime('%Y-%m-%d %H:%M') if txn else 'N/A'
    draw_line(f"Transaction Date: {txn_str}")
    draw_line(f"Total Payment: Rs. {order.get('payment_amount', 0):.2f}")

    y -= line_height
    draw_line("Products:")
    for name in order.get('product_names', []):
        draw_line(f"- {name}", indent=20)

    # Footer (optional)


    y -= line_height  # add a bit of space before the footer
    draw_line("Thank you for shopping with us!", indent=0)
    draw_line("ShopKhana.pk", indent=0)
   
    #Finalize and close the page.
    p.showPage()
    p.save()

    # Move buffer to start
    buffer.seek(0)
    # Send as PDF attachment
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"Invoice_{order_no}.pdf"
    )



# Check Cancellation Eligibility: Allow cancellation only within 1 hours.
@app.route('/check-cancel-order/<order_id>')
@login_required
def check_cancel_order(order_no):
    order = mongo.db.orders.find_one({"order_no": order_no, "user_email": current_user.email})
    if not order:
        return jsonify({"allowed": False, "message": "Order not found."})
    now = datetime.datetime.utcnow()
    if now - order.get("transaction_date") > datetime.timedelta(hours=1):
        return jsonify({"allowed": False, "message": "Cancellation not allowed."})
    return jsonify({"allowed": True, "message": "Order can be canceled."})



@app.route('/mark-confirmed/<order_id>', methods=['GET','POST'])
@login_required
def mark_confirmed(order_no):
    user_email = current_user.email
    res = mongo.db.orders.update_one(
        {"order_no": order_no, "user_email": user_email},
        {"$set": {"order_status": "Confirmed"}}  # Update the order status to 'Confirmed'
    )
    if res.modified_count == 1:
        return jsonify({"status": "ok"}), 200
    return jsonify({"status": "fail"}), 400



# Cancel Order: Update the order status to 'Canceled' if eligible.
@app.route('/cancel_order/<order_no>', methods=["POST"])
@login_required
def cancel_order(order_no):
    reason = request.json.get("reason", "")
    order = mongo.db.orders.find_one({"order_no": order_no, "user_email": current_user.email})
    if not order:
        return jsonify({"status": "error", "message": "Order not found."}), 404
    now = datetime.datetime.utcnow()
    if now - order.get("transaction_date") > datetime.timedelta(hours=1):
        return jsonify({"status": "error", "message": "Cancellation not allowed."}), 400
    result = mongo.db.orders.update_one(
        {"order_no": order_no, "user_email": current_user.email},
        {"$set": {"order_status": "Canceled", "cancellation_reason": reason}}
    )
    if result.modified_count > 0:
        return jsonify({"status": "success", "message": "Order canceled successfully."})
    else:
        return jsonify({"status": "error", "message": "Failed to cancel order."}), 500




@app.route("/__debug__")
def debug_route():
    return f"Scheme: {request.scheme} | Remote addr: {request.remote_addr}"



if __name__ == '__main__':
    app.run()
