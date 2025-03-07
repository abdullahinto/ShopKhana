import os
import json
import base64
import hmac
import hashlib
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_pymongo import PyMongo
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_mail import Mail, Message
from flask_dance.contrib.google import make_google_blueprint, google
from flask_dance.contrib.facebook import make_facebook_blueprint, facebook
from bson.objectid import ObjectId
import logging
import random
from urllib.parse import parse_qs, urlencode




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

mongo = PyMongo(app)
mail = Mail(app)

# Setup Flask-Login
login_manager = LoginManager(app)
login_manager.login_view = "index"  # if not logged in, redirect to auth page

# Setup itsdangerous serializer
serializer = URLSafeTimedSerializer(app.config["SECRET_KEY"])



# ---------------
# HELPER FUNCTIONS
# ---------------

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







@app.route('/product_details')
def product_page_url():
    return render_template('product_details.html')

@app.route('/manage_account')
@login_required
def manage_account():
    return render_template('manage_account.html')

@app.route('/my-orders')
@login_required
def my_orders():
    return render_template('myorders.html')



# Wishlist: Get the current user's wishlist items.
@app.route('/my_wish')
@login_required
def my_wish():
    # Use the logged-in user's email as foreign key to fetch wishlist records.
    user_email = current_user.email
    wishlist_items = list(mongo.db.wishlist.find({"user_email": user_email}))
    for item in wishlist_items:
        item["_id"] = str(item["_id"])
    return render_template("my_wish.html", wishlist_items=wishlist_items)

# Delete an individual wishlist item (POST request)
@app.route('/my_wish/delete/<item_id>', methods=["POST"])
@login_required
def delete_wishlist_item(item_id):
    user_email = current_user.email
    result = mongo.db.wishlist.delete_one({"_id": ObjectId(item_id), "user_email": user_email})
    if result.deleted_count:
        flash("Wishlist item deleted successfully.", "success")
    else:
        flash("Failed to delete wishlist item.", "error")
    return redirect(url_for("my_wish"))

# Bulk deletion: Delete selected items (assume IDs are sent as a comma-separated string)
@app.route('/my_wish/delete_selected', methods=["POST"])
@login_required
def delete_selected_wishlist():
    user_email = current_user.email
    ids = request.form.get("selected_ids")  # Expected as a comma-separated string of IDs
    if ids:
        id_list = [ObjectId(i.strip()) for i in ids.split(",") if i.strip()]
        result = mongo.db.wishlist.delete_many({"_id": {"$in": id_list}, "user_email": user_email})
        flash(f"Deleted {result.deleted_count} wishlist item(s).", "success")
    else:
        flash("No items selected.", "error")
    return redirect(url_for("my_wish"))

# Bulk deletion: Delete all wishlist items for the user
@app.route('/my_wish/delete_all', methods=["POST"])
@login_required
def delete_all_wishlist():
    user_email = current_user.email
    result = mongo.db.wishlist.delete_many({"user_email": user_email})
    flash(f"Deleted {result.deleted_count} wishlist item(s).", "success")
    return redirect(url_for("my_wish"))

# (Optional) Sharing functionality: This endpoint returns a shareable URL for a given wishlist item.
# In many cases, your product URLs are already shareable. Here we show an example endpoint.
@app.route('/my_wish/share/<item_id>', methods=["GET"])
@login_required
def share_wishlist_item(item_id):
    # Fetch the wishlist item to get the associated product ID or URL.
    user_email = current_user.email
    item = mongo.db.wishlist.find_one({"_id": ObjectId(item_id), "user_email": user_email})
    if not item:
        return jsonify({"error": "Wishlist item not found."}), 404
    # Assume item has a field 'product_url' that links to the product page.
    share_url = item.get("product_url", url_for("product_page_url", product_id=item.get("product_id"), _external=True))
    return jsonify({"share_url": share_url})
    

@app.route('/my-reviews')
@login_required
def my_reviews():
    return render_template('my_reviews.html')


@app.route('/my-returns')
@login_required
def returns_page():
    return render_template('returns_page.html')

@app.route('/my-cancelled-orders')
@login_required
def cancel_page():
    return render_template('cancel_page.html')


@app.route('/del_info_promo_page')
@login_required
def del_info_promo_page():
    return render_template('del_info_promo_page.html')

@app.route('/cart')
@login_required
def cart():
    return render_template('cart.html')


@app.route('/payments')
@login_required
def payments():
    return render_template('pay_page.html')

@app.route('/order_placed')
@login_required
def final_order():
    return render_template('final_order.html')




if __name__ == '__main__':
    app.run(debug=True)
