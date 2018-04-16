# -*- coding: utf-8 -*-
"""Helper utilities and decorators."""
from flask import flash

from bemychange.extensions import db


def flash_errors(form, category='warning'):
    """Flash all errors for a form."""
    for field, errors in form.errors.items():
        for error in errors:
            flash('{0} - {1}'.format(getattr(form, field).label.text, error), category)


def with_transaction(func):
    def wrapper(*args, **kwargs):
        with db.transaction():
            return func(*args, **kwargs)
    return wrapper
