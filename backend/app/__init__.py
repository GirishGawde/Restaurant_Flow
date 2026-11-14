"""
app/__init__.py
Owner: Girish (Module 1 - Admin & Auth)

Application factory:
- Loads configuration
- Enables CORS for frontend (http://localhost:5173)
- Registers global JSON error handlers
- Registers all team blueprints (auth_admin, waiter, kitchen, cashier)
"""

from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.errors import register_error_handlers
from app.routes.auth_admin import auth_admin_bp
from app.routes.waiter import waiter_bp
from app.routes.kitchen import kitchen_bp
from app.routes.cashier import cashier_bp


def create_app(config_class=Config):
    """Factory function to configure and instantiate the Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable Cross-Origin Resource Sharing (CORS) for Vite React frontend
    CORS(
        app,
        resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
        supports_credentials=True,
    )

    # Register centralized error handlers
    register_error_handlers(app)

    # Register modular blueprints for each team member
    app.register_blueprint(auth_admin_bp)
    app.register_blueprint(waiter_bp)
    app.register_blueprint(kitchen_bp)
    app.register_blueprint(cashier_bp)

    return app
