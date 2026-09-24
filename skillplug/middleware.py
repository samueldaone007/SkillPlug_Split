"""
Security response headers middleware.

Sets Permissions-Policy and a Content-Security-Policy that is broad enough
not to break the CDN-based templates (Tailwind CDN, HTMX, Alpine, Google
Fonts) and Django admin, while still blocking obvious vectors
(object-src, frame-ancestors, base-uri).
"""

from django.conf import settings


SECURITY_HEADERS = {
    "Permissions-Policy": (
        "camera=(), geolocation=(), microphone=(), payment=()"
    ),
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https:; "
        "frame-src 'self'; "
        "frame-ancestors 'self'; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    ),
}


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not settings.DEBUG:
            for header, value in SECURITY_HEADERS.items():
                if header not in response:
                    response[header] = value
        return response