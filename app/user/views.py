# -*- coding: utf-8 -*-
"""User views."""
from flask import Blueprint, render_template, abort, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user

from app.user.models import User, Article
from app.user.file_handler import save_uploaded_file, convert_to_html, allowed_file

blueprint = Blueprint("user", __name__, url_prefix="/users", static_folder="../static")


@blueprint.route("/")
@login_required
def members():
    """List members."""
    return render_template("users/members.html")


@blueprint.route("/writers/")
@login_required
def writers():
    """Writers page."""
    if not current_user.is_writer:
        abort(403)
    articles = Article.query.filter_by(username=current_user.username).all()
    return render_template("users/writers.html", articles=articles)


@blueprint.route("/compose/")
@login_required
def compose_article(error=None):
    """Compose article page."""
    if not current_user.is_writer:
        abort(403)
    return render_template("users/compose_article.html", error=error)


@blueprint.route("/upload/", methods=["POST"])
@login_required
def upload_file():
    """Handle file upload and conversion."""
    if not current_user.is_writer:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Check if file was provided
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use PDF or DOCX"}), 400
    
    # Save and convert file
    file_path = save_uploaded_file(file)
    if not file_path:
        return jsonify({"error": "Failed to save file"}), 400
    
    # Get file extension
    file_ext = file.filename.rsplit('.', 1)[1].lower()
    
    # Convert to HTML
    html_content = convert_to_html(file_path, file_ext)
    if not html_content:
        return jsonify({"error": "Failed to convert file"}), 400
    
    return jsonify({"html": html_content}), 200


@blueprint.route("/article/create/", methods=["POST"])
@login_required
def create_article():
    """Create a new article."""
    if not current_user.is_writer:
        abort(403)
    
    title = request.form.get("title")
    tag = request.form.get("tag")
    content = request.form.get("content")
    
    # Validate inputs
    if not title or not tag or not content:
        flash("All fields are required.", "danger")
        return redirect(url_for("user.compose_article"))
    
    # Check if tag already exists
    existing = Article.query.filter_by(tag=tag).first()
    if existing:
        flash(f"Article tag '{tag}' already exists. Please use a different tag.", "danger")
        return redirect(url_for("user.compose_article", f"Article tag '{tag}' already exists. Please use a different tag."))
    
    # Create article
    try:
        article = Article.create(
            username=current_user.username,
            title=title,
            tag=tag,
            content=content
        )
        flash(f"Article '{title}' created successfully!", "success")
        return redirect(url_for("user.writers"))
    except Exception as e:
        flash(f"Error creating article: {str(e)}", "danger")
        return redirect(url_for("user.compose_article"))


@blueprint.route("/check-tag/", methods=["POST"])
@login_required
def check_tag():
    """Check if a tag is available in the database."""
    if not current_user.is_writer:
        return jsonify({"available": False}), 403
    
    data = request.get_json()
    tag = data.get("tag", "").strip()
    
    if not tag:
        return jsonify({"available": False})
    
    # Check if tag already exists
    existing = Article.query.filter_by(tag=tag).first()
    
    return jsonify({"available": existing is None})


@blueprint.route("/admin/")
@login_required
def admin():
    """Admin page."""
    if not current_user.is_admin:
        abort(403)
    pending = Article.query.filter_by(approved=False).all()
    return render_template("users/admin.html", pending=pending)


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

@blueprint.route("/admin/approve_articles/")
@login_required
def approve_articles():
    """Approve Articles Page"""
    if not current_user.is_admin:
        abort(403)
    pending_articles = Article.query.filter_by(approved=False).all()
    return render_template("users/approve_articles.html", articles=pending_articles)

@blueprint.route("/admin/approve_article/<int:article_id>/", methods=["POST"])
@login_required
def approve_article(article_id):
    """Approve a specific article."""
    if not current_user.is_admin:
        abort(403)
    
    article = Article.query.get_or_404(article_id)
    article.approved = True
    article.save()
    flash(f"Article '{article.title}' has been approved.", "success")
    
    return redirect(url_for("user.approve_articles"))

@blueprint.route("/admin/reject_article/<int:article_id>/", methods=["POST"])
@login_required
def reject_article(article_id):
    """Reject a specific article."""
    if not current_user.is_admin:
        abort(403)
    
    article = Article.query.get_or_404(article_id)
    article.delete()
    flash(f"Article '{article.title}' has been rejected and deleted.", "success")
    
    return redirect(url_for("user.approve_articles"))

@blueprint.route("/admin/edit_article/<int:article_id>/", methods=["GET", "POST"])
@login_required
def edit_article(article_id, edit=True):
    """Edit a specific article."""
    if not current_user.is_admin:
        abort(403)
    
    article = Article.query.get_or_404(article_id)
    
    if request.method == "POST":
        title = request.form.get("title")
        content = request.form.get("content")
        
        if title and content:
            article.title = title
            article.content = content
            article.save()
            flash(f"Article '{article.title}' has been updated.", "success")
            return redirect(url_for("user.approve_articles"))
        else:
            flash("Title and content are required.", "danger")
    
    return render_template("users/edit_article.html", article=article, edit=edit)