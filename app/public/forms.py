# -*- coding: utf-8 -*-
"""Public forms."""
from flask import current_app
from flask_wtf import FlaskForm
from wtforms import PasswordField, StringField
from wtforms.validators import DataRequired

from app.user.models import User
from app.extensions import bcrypt, db


class LoginForm(FlaskForm):
    """Login form."""

    username = StringField("Username", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])
    

    def __init__(self, *args, **kwargs):
        """Create instance."""
        super(LoginForm, self).__init__(*args, **kwargs)
        self.user = None

    def validate(self, **kwargs):
        """Validate the form."""
        initial_validation = super(LoginForm, self).validate()
        if not initial_validation:
            return False
        db.session.commit()
        current_app.logger.info("Printing Username")
        current_app.logger.info(self.username.data)
        current_app.logger.info("All users: %s", User.query.all())
        self.user = User.query.filter_by(username=str(self.username.data)).first()
        
        current_app.logger.info(self.user)
        if not self.user:
            self.username.errors.append("Unknown username")
            return False
        
        if not self.user.check_password(self.password.data):
            self.password.errors.append("Invalid password")
            return False

        if not self.user.active:
            self.username.errors.append("User not activated")
            return False
        return True
        
