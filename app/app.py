# -*- coding: utf-8 -*-
"""The app module, containing the app factory function."""
import logging
import sys

from flask import Flask, render_template, jsonify, request

from app import commands, public, user
from app.extensions import (
    bcrypt,
    cache,
    csrf_protect,
    db,
    debug_toolbar,
    flask_static_digest,
    login_manager,
    migrate,
)

# If you use app factory:
# app = create_app()
# register_error_handlers(app)

def create_app(config_object="app.settings"):
    """Create application factory, as explained here: http://flask.pocoo.org/docs/patterns/appfactories/.

    :param config_object: The configuration object to use.
    """
    app = Flask(__name__.split(".")[0])
    app.config.from_object(config_object)
    register_extensions(app)
    register_blueprints(app)
    register_errorhandlers(app)
    register_shellcontext(app)
    register_commands(app)
    configure_logger(app)
    return app


def register_extensions(app):
    """Register Flask extensions."""
    bcrypt.init_app(app)
    cache.init_app(app)
    db.init_app(app)
    csrf_protect.init_app(app)
    login_manager.init_app(app)
    debug_toolbar.init_app(app)
    migrate.init_app(app, db)
    flask_static_digest.init_app(app)
    return None


def register_blueprints(app):
    """Register Flask blueprints."""
    app.register_blueprint(public.views.blueprint)
    app.register_blueprint(user.views.blueprint)
    return None


def register_errorhandlers(app):
    """Register error handlers."""

    @app.errorhandler(500)
    def internal_error(error):
        # Check if it's an AJAX request or one expecting JSON
        if request.is_xhr or request_wants_json(request):
            return jsonify({'error': 'Internal server error'}), 500
        return render_template('500.html'), 500

    @app.errorhandler(404)
    def not_found(error):
        """Page not found."""
        if request_wants_json(request):
            return jsonify({"error": "Not Found"}), 404
    
        return render_template("errors/404.html"), 404

    @app.errorhandler(401)
    def unauthorized(error):
        if request_wants_json(request):
            return jsonify({'error': 'Unauthorized'}), 401
        return render_template('401.html'), 401

    return None

def request_wants_json(request):
    """Check if the client prefers JSON response."""
    best = request.accept_mimetypes.best_match(['application/json', 'text/html'])
    return (best == 'application/json' and 
            request.accept_mimetypes['application/json'] > 
            request.accept_mimetypes['text/html'])

def register_shellcontext(app):
    """Register shell context objects."""

    def shell_context():
        """Shell context objects."""
        return {"db": db, "User": user.models.User}

    app.shell_context_processor(shell_context)


def register_commands(app):
    """Register Click commands."""
    app.cli.add_command(commands.test)
    app.cli.add_command(commands.lint)


def configure_logger(app):
    """Configure loggers."""
    handler = logging.StreamHandler(sys.stdout)
    if not app.logger.handlers:
        app.logger.addHandler(handler)
