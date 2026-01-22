# -*- coding: utf-8 -*-
"""User views."""
from flask import Blueprint, render_template, abort, redirect, url_for, flash, request
from flask_login import login_required, current_user

from app.user.models import User

blueprint = Blueprint("user", __name__, url_prefix="/users", static_folder="../static")


@blueprint.route("/")
@login_required
def members():
    """List members."""
    return render_template("users/members.html")


@blueprint.route("/admin/")
@login_required
def admin():
    """Admin page."""
    if not current_user.is_admin:
        abort(403)
    return render_template("users/admin.html")


@blueprint.route("/admin/add_admin", methods=["POST"])
@login_required
def add_admin():
    """Add a user as admin."""
    if not current_user.is_admin:
        abort(403)
    
    username = request.form.get("username")
    user = User.query.filter_by(username=username).first()
    
    if not user:
        flash(f"User '{username}' not found.", "danger")
    elif user.is_admin:
        flash(f"User '{username}' is already an admin.", "warning")
    else:
        user.is_admin = True
        user.save()
        flash(f"User '{username}' is now an admin.", "success")
    
    return redirect(url_for("user.admin"))


@blueprint.route("/admin/remove_admin", methods=["POST"])
@login_required
def remove_admin():
    """Remove admin privileges from a user."""
    if not current_user.is_admin:
        abort(403)
    
    username = request.form.get("username")
    user = User.query.filter_by(username=username).first()
    
    if not user:
        flash(f"User '{username}' not found.", "danger")
    elif not user.is_admin:
        flash(f"User '{username}' is not an admin.", "warning")
    elif user.id == current_user.id:
        flash("You cannot remove your own admin privileges.", "danger")
    else:
        user.is_admin = False
        user.save()
        flash(f"Admin privileges removed from '{username}'.", "success")
    
    return redirect(url_for("user.admin"))


@blueprint.route("/admin/add_writer", methods=["POST"])
@login_required
def add_writer():
    """Add a user as writer."""
    if not current_user.is_admin:
        abort(403)
    
    username = request.form.get("username")
    user = User.query.filter_by(username=username).first()
    
    if not user:
        flash(f"User '{username}' not found.", "danger")
    elif user.is_writer:
        flash(f"User '{username}' is already a writer.", "warning")
    else:
        user.is_writer = True
        user.save()
        flash(f"User '{username}' is now a writer.", "success")
    
    return redirect(url_for("user.admin"))


@blueprint.route("/admin/remove_writer", methods=["POST"])
@login_required
def remove_writer():
    """Remove writer privileges from a user."""
    if not current_user.is_admin:
        abort(403)
    
    username = request.form.get("username")
    user = User.query.filter_by(username=username).first()
    
    if not user:
        flash(f"User '{username}' not found.", "danger")
    elif not user.is_writer:
        flash(f"User '{username}' is not a writer.", "warning")
    else:
        user.is_writer = False
        user.save()
        flash(f"Writer privileges removed from '{username}'.", "success")
    
    return redirect(url_for("user.admin"))
