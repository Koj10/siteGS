import os

from dotenv import load_dotenv
from flask import (
    Flask,
    render_template,
    send_from_directory,
    request,
    redirect,
    url_for,
    make_response,
)

load_dotenv()

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
    return render_template("shop.html", api_base=_api_base())


@app.route("/profile")
def profile():
    return render_template("profile.html", api_base=_api_base())


@app.route("/login")
def login():
    return render_template("login.html", api_base=_api_base())


@app.route("/verify")
def verify():
    return render_template("verify.html", api_base=_api_base())


@app.route("/login_pc/<pc_token>")
def login_pc(pc_token):
    response = make_response(redirect(url_for("index")))
    response.set_cookie("pc_token", pc_token, path="/")
    return response


@app.route("/admin")
def admin():
    return render_template("admin.html", admin_nav="overview", api_base=_api_base())


@app.route("/admin/<action>")
def action_admin(action):
    allowed = {"add_balance", "pc", "revenue"}
    if action not in allowed:
        return redirect(url_for("admin"))
    nav_map = {"add_balance": "clients", "pc": "pc", "revenue": "revenue"}
    return render_template(
        f"{action}.html", admin_nav=nav_map.get(action, "overview"), api_base=_api_base()
    )


@app.route("/reset-password/<token>")
def reset_password(token):
    return render_template("reset.html", api_base=_api_base())


@app.route("/price")
def price():
    return render_template("price.html", api_base=_api_base())


@app.route("/roulette")
def roulette():
    return render_template("roulette.html", api_base=_api_base())


def _api_base() -> str:
    """
    API origin for browser JS (window.GS_API_BASE).
    Prefer GS_API_BASE from .env; otherwise derive from request host.
    """
    explicit = (os.getenv("GS_API_BASE") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    host = request.host.split(":")[0].strip() if request.host else "127.0.0.1"
    if host in ("127.0.0.1", "localhost"):
        return "http://127.0.0.1:5006"
    return f"http://{host}:6001"


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5005)
