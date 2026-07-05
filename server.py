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


@app.route("/profile")
def profile():
    return render_template("profile.html")


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
    return render_template(f"admin.html")


@app.route("/admin/<action>")
def action_admin(action):
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
