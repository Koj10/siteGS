import os

from flask import (
    Flask,
    render_template,
    send_from_directory,
    request,
    redirect,
    url_for,
    make_response,
)

app = Flask(__name__)


@app.context_processor
def inject_api_base():
    return {"gs_api_base": os.getenv("GS_API_BASE", "https://api.game-sense.ru")}

PUBLIC_ROUTES = {"login", "static", "login_pc", "reset_password", "price"}


@app.before_request
def require_login():
    if request.endpoint in PUBLIC_ROUTES:
        return

    token = request.cookies.get("jwt_token")
    if not token:
        return redirect(url_for("login"))


@app.route("/")
def index():
    return render_template("shop.html")


@app.route("/account")
def account():
    return render_template("account.html")


@app.route("/settings")
def settings_page():
    return render_template("settings.html")


@app.route("/loyalty")
def loyalty():
    return render_template("loyalty.html")


@app.route("/profile")
def profile():
    return render_template("profile.html")


@app.route("/friends")
def friends():
    return render_template("friends.html")


@app.route("/user/<int:user_id>")
def user_profile_page(user_id):
    return render_template("user_profile.html", user_id=user_id)


@app.route("/login")
def login():
    return render_template("login.html")


@app.route("/verify")
def verify():
    return render_template("verify.html")


@app.route("/login_pc/<pc_token>")
def login_pc(pc_token):
    response = make_response(redirect(url_for("index")))
    response.set_cookie("pc_token", pc_token, path="/")
    return response


@app.route("/admin")
def admin():
    return render_template("admin.html")


@app.route("/admin/<action>")
def action_admin(action):
    tab_map = {"add_balance": "balance", "pc": "sessions"}
    if action in tab_map:
        return redirect(f"/admin?tab={tab_map[action]}")
    return render_template(f"{action}.html")


@app.route("/reset-password/<token>")
def reset_password(token):
    return render_template("reset.html")


@app.route("/price")
def price():
    return render_template("price.html")


@app.route("/roulette")
def roulette():
    return render_template("roulette.html")


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
