"""JWT authentication that blocks suspended accounts from all API access."""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class BannedUserJWTAuthentication(JWTAuthentication):
    """Reject suspended users during token authentication.

    This makes every protected endpoint return 401 for a suspended account,
    which the React interceptor turns into a forced logout.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user is not None and getattr(user, "is_suspended", False):
            raise InvalidToken("This account has been suspended.")
        return user