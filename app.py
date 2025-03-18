import os
import smtplib
import json
import base64
import hmac
import hashlib
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify,session
from flask_pymongo import PyMongo
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
from flask_dance.contrib.google import make_google_blueprint, google
from flask_dance.contrib.facebook import make_facebook_blueprint, facebook
from bson.objectid import ObjectId
import logging
import random
from urllib.parse import parse_qs, urlencode
import re
import pytesseract
from PIL import Image, ImageEnhance, ImageOps
import datetime
from bson import Binary
import io
import cv2
import numpy as np
from pytesseract import Output
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText




os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)



app = Flask(__name__)

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


# Configure file upload folder and allowed extensions (adjust as needed)
app.config["UPLOAD_FOLDER"] = os.path.join(os.getcwd(), "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}

mongo = PyMongo(app)
mail = Mail(app)

# Setup Flask-Login
login_manager = LoginManager(app)
login_manager.login_view = "index"  # if not logged in, redirect to auth page

# Setup itsdangerous serializer
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])


# Ensure Upload Folder Exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# ---------------
# HELPER FUNCTIONS
# ---------------


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def mask_email(email):
    try:
        local, domain = email.split("@")
        if len(local) <= 1:
            return email
        # Show the first letter and mask the rest of the local part.
        return local[0] + "*" * (len(local) - 1) + "@" + domain
    except Exception:
        return email

app.jinja_env.filters["mask_email"] = mask_email



def get_banners(limit=5):
    """
    Fetch banners from the 'banners' collection.
    Limit the number if needed (e.g., 5).
    """
    banners_cursor = mongo.db.banners.find().limit(limit)
    banners = []
    for ban in banners_cursor:
        ban['_id'] = str(ban['_id'])
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
    return flash_sale_products

   

   
def get_categories():
    """
    Fetch categories from the 'categories' collection.
    """
    cat_cursor = mongo.db.categories.find()
    categories = []
    for cat in cat_cursor:
        cat['_id'] = str(cat['_id'])
        categories.append(cat)
    return categories


def get_just_for_you_products(limit=6):
    """
    Fetch 'Just For You' products. 
    This can be random or personalized logic.
    For now, we randomly pick from 'products' or 
    filter by some condition. Here we just pick randomly.
    """
    all_products = list(mongo.db.products.find())
    random.shuffle(all_products)  # randomize
    just_for_you = []
    for prod in all_products[:limit]:
        prod['_id'] = str(prod['_id'])
        just_for_you.append(prod)
    return just_for_you


def get_rec_for_you_products(limit=6):
    """
    Fetch 'Recomended For You' products. 
    This can be random or personalized logic.
    For now, we randomly pick from 'products' or 
    filter by some condition. Here we just pick randomly.
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



@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get("email")
        user = mongo.db.users.find_one({"email": email})
        if user:
            # Generate a secure token valid for 1 hour
            token = serializer.dumps(email, salt='password-reset-salt')
            reset_url = url_for('reset_password', token=token, _external=True)
            # Send reset email using Flask-Mail
            subject = "Password Reset Request for ShopKhana"
            body = f"""Hello,

We received a request to reset the password for your ShopKhana account.

To reset your password, please click the following link or copy it into your browser:

{reset_url}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

Thank you,
The ShopKhana Team
"""
            try:
                msg = Message(subject, recipients=[email], body=body)
                mail.send(msg)
                flash('A password reset link has been sent to your email. Check your inbox now.', "info")
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
    new_quantity = data.get("quantity")
    
    if not all([user_email, product_id, selected_color, new_quantity]):
        return jsonify({"success": False, "message": "Missing data."}), 400

    result = mongo.db.cart.update_one(
        {
            "user_email": user_email,
            "products": {"$elemMatch": {"product_id": product_id, "selected_color": selected_color}}
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
    
    if not all([user_email, product_id, selected_color]):
        return jsonify({"success": False, "message": "Missing data."}), 400

    result = mongo.db.cart.update_one(
        {"user_email": user_email},
        {"$pull": {"products": {"product_id": product_id, "selected_color": selected_color}}}
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
        mongo.db.cart.update_one(
            {"user_email": user_email},
            {"$pull": {"products": {"product_id": product_id, "selected_color": selected_color}}}
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

    # Pass them to main_page.html (Jinja2 template)
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


@app.route('/submit_review/<product_id>', methods=["POST"])
@login_required
def submit_review(product_id):
    try:
        review_text = request.form.get("review_text", "").strip()
        rating = float(request.form.get("rating", 0))
        if not review_text or rating <= 0:
            flash("Please provide a valid review and rating.", "error")
            return redirect(url_for("product_page", product_id=product_id))
        
        # Build the product's full URL (external) for matching FAQs if needed
        product_url = url_for("product_page", product_id=product_id, _external=True)
        
        # Retrieve all uploaded files from the input named "review_images"
        files = request.files.getlist("review_images")
        app.logger.debug("Number of files received: %s", len(files))
        img_urls = []
        for file in files:
            app.logger.debug("Processing file: %s", file.filename)
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(save_path)
                url = url_for('static', filename=f'uploads/{filename}', _external=True)
                img_urls.append(url)
                app.logger.debug("Saved file '%s' and generated URL: %s", filename, url)
            else:
                app.logger.debug("File skipped (not allowed or empty): %s", file.filename)
        
        # If no images are uploaded, store an empty list
        if not img_urls:
            img_urls = []
        
        review_record = {
            "product_id": product_id,
            "ProductLink": product_url,
            "user_email": current_user.email,
            "review": review_text,
            "rating": rating,
            "img": img_urls  # Now a list of image URLs
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
        quantity = int(request.form.get("quantity", 1))
        if not selected_color:
            return jsonify({"success": False, "message": "Please select a color variation."}), 400
        
        user_email = current_user.email
        
        # Find the cart document for this user.
        cart_doc = mongo.db.cart.find_one({"user_email": user_email})
        if cart_doc:
            # Check if the product (with the same color) already exists in the products array.
            existing_product = None
            for prod in cart_doc.get("products", []):
                if prod.get("product_id") == product_id and prod.get("selected_color") == selected_color:
                    existing_product = prod
                    break

            if existing_product:
                # If found, increment the quantity.
                mongo.db.cart.update_one(
                    {
                        "user_email": user_email,
                        "products.product_id": product_id,
                        "products.selected_color": selected_color
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
        if not selected_color:
            return jsonify({"success": False, "message": "Please select a color variation."}), 400
        
        user_email = current_user.email
        
        # Find the wishlist document for this user.
        wishlist_doc = mongo.db.wishlist.find_one({"user_email": user_email})
        if wishlist_doc:
            # Check if the product (with the same color) is already in the wishlist.
            exists = any(
                item.get("product_id") == product_id and item.get("selected_color") == selected_color
                for item in wishlist_doc.get("products", [])
            )
            if exists:
                message = "Item is already in your wishlist."
            else:
                mongo.db.wishlist.update_one(
                    {"user_email": user_email},
                    {"$push": {"products": {"product_id": product_id,
                                             "selected_color": selected_color}}}
                )
                message = "Item added to wishlist successfully."
        else:
            # No wishlist document for the user, so create one.
            new_wishlist = {
                "user_email": user_email,
                "products": [{
                    "product_id": product_id,
                    "selected_color": selected_color
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





# @app.route('/product_details')
# def product_page_url():
#     return render_template('product_details.html')

@app.route('/manage_account')
@login_required
def manage_account():
    return render_template('manage_account.html')

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
            product = mongo.db.products.find_one(
                {"_id": ObjectId(product_id)},
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
            if product:
                product["_id"] = str(product["_id"])
                wishlist_items.append({
                    "product_id": product["_id"],
                    "title": product.get("title", "No Title"),
                    "image": product.get("images", [""])[0],
                    "productCategory": product.get("productCategory", "Uncategorized"),
                    "brand": product.get("brand", "N/A"),
                    "selected_color": selected_color,
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
    user_email = current_user.email
    result = mongo.db.wishlist.update_one(
        {"user_email": user_email},
        {"$pull": {"products": {"product_id": product_id, "selected_color": selected_color}}}
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





@app.route('/my-reviews')
@login_required
def my_reviews():
    return render_template('my_reviews.html')


@app.route('/my-orders')
@login_required
def my_orders():
    return render_template('myorders.html')



@app.route('/my-returns')
@login_required
def returns_page():
    return render_template('returns_page.html')

@app.route('/my-cancelled-orders')
@login_required
def cancel_page():
    return render_template('cancel_page.html')


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

# @app.route('/save_order_summary', methods=['POST'])
# def save_order_summary():
#     if 'user_email' not in session:
#         return jsonify({"error": "User not logged in"}), 401

#     user_email = session['user_email']
    
#     # Encrypt the email (simple hashing for now)
#     encrypted_email = hashlib.sha256(user_email.encode()).hexdigest()

#     data = request.json  # Data coming from frontend
#     order_summary = {
#         "user_id": encrypted_email,  # Unique identifier
#         "items": data.get("items", []),  # List of products in order
#         "total_price": data.get("total_price", 0),
#         "discount_applied": data.get("discount_applied", 0),
#         "delivery_fee": data.get("delivery_fee", 0),
#         "grand_total": data.get("grand_total", 0),
#         "delivery_info": data.get("delivery_info", {}),
#         "timestamp": datetime.utcnow()
#     }

#     # Save the order summary in MongoDB
#     order_summary_id = mongo.db.order_summary.insert_one(order_summary).inserted_id

#     return jsonify({
#         "message": "Order summary saved",
#         "order_id": str(order_summary_id),
#         "user_id": encrypted_email
#     }), 200


# --- Delivery/Promotion Page Endpoint ---
@app.route('/del_info_promo_page', methods=["GET", "POST"])
@login_required
def del_info_promo_page():
    user_email = current_user.email
    product_id = request.args.get("product_id")  # Optional for Buy Now scenario
    if product_id:
        session["product_id"] = product_id

    # If POST, process the form submission (fallback when AJAX not used)
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

    # If product_id is provided, load that product (Buy Now scenario)
    if product_id:
        product = mongo.db.products.find_one({"_id": ObjectId(product_id)})
        if product:
            product["_id"] = str(product["_id"])
            selected_product = {
                "_id": product["_id"],
                "title": product["title"],
                "image": product.get("images", [""])[0],
                "productCategory": product.get("productCategory", "Uncategorized"),
                "selected_color": product.get("colors", ["N/A"])[0] if product.get("colors", ["N/A"]) else "N/A",
                "price": product["discountedPrice"],
                "originalprice": product["originalPrice"],
                "discountpercent": product["discountPercent"],
                "quantity": 1
            }
            products = [selected_product]
        else:
            products = []
    else:
        # Full cart checkout: get the single cart document for the user.
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
                        "price": prod.get("discountedPrice", 0),
                        "originalprice": prod.get("originalPrice", 0),
                        "discountpercent": prod.get("discountPercent", 0),
                        "quantity": item.get("quantity", 1)
                    })
        else:
            products = []

        # Calculate totals based on the products array.
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
    If session['product_id'] exists, returns that product's details in single-element arrays.
    Otherwise, fetches the cart document for the user and extracts all product details from the 'products' array.
    """
    product_id = session.get("product_id")
    if product_id:
        product_doc = mongo.db.products.find_one({"_id": ObjectId(product_id)}, {"title": 1})
        current_product_ids = [product_id]
        current_product_names = [product_doc["title"] if product_doc and "title" in product_doc else "N/A"]
    else:
        # Fetch the entire cart document for the user
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

    # Updated helper function for product data
    def get_current_product_data(user_email):
        product_id = session.get("product_id")
        if product_id:
            product_doc = mongo.db.products.find_one({"_id": ObjectId(product_id)}, {"title": 1})
            current_product_ids = [product_id]
            current_product_names = [product_doc["title"] if product_doc and "title" in product_doc else "N/A"]
        else:
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

    # --- Handle Cash on Delivery (COD) ---
    if payment_method == "cod":
        cod_record = mongo.db.main_details.find_one({}, {"codfee": 1})
        cod_fee = cod_record.get("codfee", 50) if cod_record else 50
        quantity = order_summary.get("quantity", 1)
        grand_total = order_summary.get("grand_total", 0)
        total_payment = float(grand_total) + (cod_fee * quantity)
        
        # Insert payment record for COD.
        payment_data = {
            "user_email": user_email,
            "payment_method": "COD",
            "amount": total_payment,
            "status": "Pending",
            "COD": cod_fee,
            "pay_date": datetime.datetime.utcnow(),
            "screenshot": None
        }
        mongo.db.payments.insert_one(payment_data)
        
        # --- Create Order Record for COD ---
        current_product_ids, current_product_names = get_current_product_data(user_email)
        
        customer_info = mongo.db.del_info.find_one(
            {"user_email": user_email},
            {"full_name": 1, "address": 1, "province": 1, "phone_number": 1}
        )
        customer_name = customer_info.get("full_name", "N/A") if customer_info else "N/A"
        address = customer_info.get("address", "N/A") if customer_info else "N/A"
        province = customer_info.get("province", "N/A") if customer_info else "N/A"
        phone_number = customer_info.get("phone_number", "N/A") if customer_info else "N/A"
        
        order_data = {
            "order_id": str(ObjectId()),
            "user_email": user_email,
            "product_ids": current_product_ids,     # Stored as an array
            "product_names": current_product_names,   # Stored as an array
            "customer_name": customer_name,
            "address": address,
            "province": province,
            "payment_method": "COD",
            "payment_amount": total_payment,
            "order_status": "Pending",
            "transaction_date": datetime.datetime.utcnow(),
            "phone_number": phone_number
        }
        mongo.db.orders.insert_one(order_data)
        
        return jsonify({
            "status": "success",
            "message": f"Cash on Delivery selected. Please be ready with Rs. {total_payment} at delivery."
        })
    
    # --- For Digital Payment Methods ---
    if payment_method != "cod" and "payment_screenshot" not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded."})
    if payment_method != "cod":
        file = request.files["payment_screenshot"]
        if file.filename == "":
            return jsonify({"status": "error", "message": "Invalid file name."})
        file_bytes = file.read()
    else:
        file_bytes = None

    try:
        original_image = Image.open(io.BytesIO(file_bytes)) if file_bytes else None
        if payment_method == "sadapay" and original_image:
            processed_image = preprocess_white_text_on_orange(original_image)
        elif original_image:
            processed_image = preprocess_image_for_ocr(original_image)
        else:
            processed_image = None
    except Exception as e:
        return jsonify({"status": "error", "message": f"Error processing image: {str(e)}"})

    extracted_amount_str = get_prominent_amount(processed_image) if processed_image else ""
    app.logger.info("Extracted prominent amount: %s", extracted_amount_str)
    expected_amount = order_summary.get("grand_total", 0)
    
    def normalize_amount(text):
        return re.sub(r'[^0-9.]', '', text)
    normalized_extracted = normalize_amount(str(extracted_amount_str)) if extracted_amount_str else ""
    normalized_expected = normalize_amount(str(expected_amount))
    
    errors = []
    expected_name = "Muhammad Akasha"
    full_extracted_text = pytesseract.image_to_string(
        processed_image, config='--oem 3 --psm 6'
    ) if processed_image else ""
    if expected_name not in full_extracted_text:
        errors.append("Account name mismatch.")
    if normalized_extracted != normalized_expected:
        errors.append(f"Amount mismatch. Expected: Rs.{normalized_expected} Found: Rs.{normalized_extracted}")
    
    if errors:
        payment_data = {
            "user_email": user_email,
            "payment_method": (payment_method.capitalize() if payment_method != "direct_bank" else get_direct_bank_label()),
            "amount": 0,
            "status": "Verification Failed: " + " ".join(errors),
            "COD": "N/A",
            "pay_date": datetime.datetime.utcnow(),
            "screenshot": Binary(file_bytes) if file_bytes else None
        }
        mongo.db.payments.insert_one(payment_data)
        return jsonify({"status": "error", "message": " ".join(errors)})
    
    verified_status = "Paid"
    method_label = (get_direct_bank_label() if payment_method == "direct_bank" else payment_method.capitalize())
    payment_data = {
        "user_email": user_email,
        "payment_method": method_label,
        "amount": expected_amount,
        "status": verified_status,
        "COD": "N/A",
        "pay_date": datetime.datetime.utcnow(),
        "screenshot": Binary(file_bytes) if file_bytes else None
    }
    mongo.db.payments.insert_one(payment_data)
    
    # --- Create Order Record for Digital Payments ---
    current_product_ids, current_product_names = get_current_product_data(user_email)
    
    customer_info = mongo.db.del_info.find_one(
        {"user_email": user_email},
        {"full_name": 1, "address": 1, "province": 1, "phone_number": 1}
    )
    customer_name = customer_info.get("full_name", "N/A") if customer_info else "N/A"
    address = customer_info.get("address", "N/A") if customer_info else "N/A"
    province = customer_info.get("province", "N/A") if customer_info else "N/A"
    phone_number = customer_info.get("phone_number", "N/A") if customer_info else "N/A"
    
    order_data = {
        "order_id": str(ObjectId()),
        "user_email": user_email,
        "product_ids": current_product_ids,     # Array of product IDs
        "product_names": current_product_names,   # Array of product names
        "customer_name": customer_name,
        "address": address,
        "province": province,
        "payment_method": method_label,
        "payment_amount": expected_amount,
        "order_status": "Processing",
        "transaction_date": datetime.datetime.utcnow(),
        "phone_number": phone_number
    }
    mongo.db.orders.insert_one(order_data)
    
    return jsonify({"status": "success", "message": "Payment verified successfully!"})



# ------------------------------
# REDIRECT FROM DEL_INFO_PROMO
# ------------------------------
@app.route("/redirect_to_pay", methods=["POST"])
@login_required
def redirect_to_pay():
    """
    Receive data from del_info_promo_page and store it in session for payment tracking.
    This includes the order summary and user email.
    """
    data = request.json
    session["order_summary"] = data.get("order_summary", {})
    session["user_email"] = data.get("user_email", "")
    return jsonify({"status": "success", "redirect_url": url_for("pay_page")})



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

  


@app.route('/order_placed')
@login_required
def order_placed():
    """
    Fetches the most recent order record for the current user,
    builds an order_details dictionary containing:
      - order_id
      - payment_amount (total)
      - items: a list of {title, price} for each product
      - estimated_delivery (current date + 3-7 days)
      - user_email
    Then, sends an email notification to admins with full order details,
    and renders the order_placed.html template with these details.
    """
    user_email = current_user.email
    # Query orders collection for the most recent order by transaction_date
    order_cursor = mongo.db.orders.find({"user_email": user_email}).sort("transaction_date", -1).limit(1)
    order_list = list(order_cursor)
    if not order_list:
        return "No order found", 404
    order = order_list[0]
    
    order_id = order.get("order_id", "N/A")
    payment_amount = order.get("payment_amount", 0)
    
    # Retrieve product details.
    # Handle both array and string cases for product_ids and product_names.
    product_ids_value = order.get("product_ids", "")
    product_names_value = order.get("product_names", "")
    items = []

    if isinstance(product_ids_value, list):
        # If the product IDs are stored as a list, assume product_names is also a list.
        product_ids = product_ids_value
        product_names = product_names_value if isinstance(product_names_value, list) else []
        for pid, pname in zip(product_ids, product_names):
            prod = mongo.db.products.find_one({"_id": ObjectId(pid)}, {"discountedPrice": 1})
            price = prod.get("discountedPrice", "N/A") if prod else "N/A"
            items.append({"title": pname, "price": price})
    else:
        # Else, assume they are strings (possibly comma separated).
        product_ids_str = product_ids_value.strip()
        product_names_str = product_names_value.strip()
        if product_ids_str and ("," in product_ids_str):
            product_ids = [pid.strip() for pid in product_ids_str.split(",")]
            product_names = [pname.strip() for pname in product_names_str.split(",")]
            for pid, pname in zip(product_ids, product_names):
                prod = mongo.db.products.find_one({"_id": ObjectId(pid)}, {"discountedPrice": 1})
                price = prod.get("discountedPrice", "N/A") if prod else "N/A"
                items.append({"title": pname, "price": price})
        elif product_ids_str:
            pid = product_ids_str
            pname = product_names_str if product_names_str else "N/A"
            prod = mongo.db.products.find_one({"_id": ObjectId(pid)}, {"discountedPrice": 1})
            price = prod.get("discountedPrice", "N/A") if prod else "N/A"
            items.append({"title": pname, "price": price})
        else:
            items = []  # Fallback if no product info found

    # Compute an estimated delivery date range: current date + between 3 and 7 days.
    today = datetime.date.today()
    delivery_start = today + datetime.timedelta(days=random.randint(3, 5))
    delivery_end = today + datetime.timedelta(days=random.randint(6, 7))
    estimated_delivery = f"Est. {delivery_start.strftime('%d %b')} - {delivery_end.strftime('%d %b')}"
    
    order_details = {
        "order_id": order_id,
        "payment_amount": payment_amount,
        "items": items,
        "estimated_delivery": estimated_delivery,
        "user_email": user_email
    }
    
    # --- Send Email Notification to Admins ---
    transaction_datetime = datetime.datetime.utcnow()
    admin_emails = ["contact.mrnow285@gmail.com"]
    msg = Message(
        subject="🚨 Payment Alert - ShopKhana",
        sender=app.config.get("MAIL_DEFAULT_SENDER"),
        recipients=admin_emails
    )
    # Build a plain text email
    msg.body = f"""Dear Admin,

A new transaction has been successfully completed on ShopKhana. Details are as follows:

Payment Details:
- User Email: {user_email}
- Payment Method: {order.get("payment_method", "N/A")}
- Payment Amount: Rs. {payment_amount}
- Transaction Date: {transaction_datetime.strftime("%d-%m-%Y")}
- Transaction Time: {transaction_datetime.strftime("%I:%M %p")}

Order Details:
- Order ID: {order_id}
- Products: {', '.join([item['title'] for item in items]) if items else 'N/A'}

Please ensure that the order is processed and dispatched at the earliest convenience.

Thank you,
ShopKhana Team
"""
    try:
        mail.send(msg)
    except Exception as e:
        app.logger.error("Failed to send email notification: %s", str(e))
    
    return render_template("order_placed.html", order_details=order_details)





if __name__ == '__main__':
    app.run(debug=True)
