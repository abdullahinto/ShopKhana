from flask import Flask, render_template
from flask_pymongo import PyMongo
import os
import random
from bson.objectid import ObjectId



app = Flask(__name__)

# Configure MongoDB
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/shopkhana")
mongo = PyMongo(app)

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
    print("Flash Sale Products:", flash_sale_products)  # Debug output
    return flash_sale_products

   

   
def get_categories(limit=12):
    """
    Fetch categories from the 'categories' collection.
    """
    cat_cursor = mongo.db.categories.find().limit(limit)
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
    flash_sale_products = get_flash_sale_products(limit=5)
    categories = get_categories(limit=12)
    just_for_you_products = get_just_for_you_products(limit=20)

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
        })
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




@app.route('/product_details')
def product_page_url():
    return render_template('product_details.html')

@app.route('/manage_account')
def manage_account():
    return render_template('manage_account.html')

@app.route('/my-orders')
def my_orders():
    return render_template('myorders.html')

@app.route('/my-wishlist')
def my_wish():
    return render_template('my_wish.html')

@app.route('/my-reviews')
def my_reviews():
    return render_template('my_reviews.html')


@app.route('/my-returns')
def returns_page():
    return render_template('returns_page.html')

@app.route('/my-cancelled-orders')
def cancel_page():
    return render_template('cancel_page.html')


@app.route('/del_info_promo_page')
def del_info_promo_page():
    return render_template('del_info_promo_page.html')

@app.route('/cart')
def cart():
    return render_template('cart.html')


@app.route('/payments')
def payments():
    return render_template('pay_page.html')

@app.route('/order_placed')
def final_order():
    return render_template('final_order.html')

@app.route('/search_results')
def search_results():
    return render_template('search_results.html')


if __name__ == '__main__':
    app.run(debug=True)
