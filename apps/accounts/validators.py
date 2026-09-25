"""
Custom password validators for SkillPlug.
"""

from django.core.exceptions import ValidationError


class StrengthValidator:
    """Require a minimum length plus uppercase, lowercase and a digit."""

    def __init__(
        self,
        min_length=8,
        require_upper=True,
        require_lower=True,
        require_digit=True,
    ):
        self.min_length = min_length
        self.require_upper = require_upper
        self.require_lower = require_lower
        self.require_digit = require_digit

    def validate(self, password, user=None):
        errors = []
        if len(password) < self.min_length:
            errors.append(
                f"Password must be at least {self.min_length} characters."
            )
        if self.require_upper and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter.")
        if self.require_lower and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter.")
        if self.require_digit and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number.")
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return (
            f"Your password must be at least {self.min_length} characters "
            "and include an uppercase letter, a lowercase letter and a number."
        )