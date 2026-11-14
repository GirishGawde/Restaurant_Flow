"""
app/routes/waiter.py
Owner: Ayush (Module 2 - Waiter and Orders)

Ayush: add your routes here.
(e.g., /tables, /orders, /orders/<id>/items, /orders/<id>/send-to-kitchen, /orders/<id>/lock, /menu)
"""

from flask import Blueprint

waiter_bp = Blueprint("waiter", __name__)
