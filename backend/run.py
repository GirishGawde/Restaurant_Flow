"""
run.py
Owner: Girish (Module 1 - Admin & Auth)

Entry point to run the Flask development server on port 5000.
Usage:
    python run.py
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Start local development server on port 5000
    # load_dotenv=False avoids Flask's default upward traversal outside the repo
    app.run(host="0.0.0.0", port=5000, debug=True, load_dotenv=False)
