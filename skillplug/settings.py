"""
SkillPlug - Nigerian Student Skills Marketplace
Django settings for production and development environments.
"""
 
from pathlib import Path
from decouple import config
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured
import os
 
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
 
 
# =============================================================================
# CORE SETTINGS
# =============================================================================
 
# SECRET_KEY is required in production. Fail fast instead of shipping with a
# known placeholder secret.
SECRET_KEY = config("SECRET_KEY", default="")

if not SECRET_KEY:
    if config("DEBUG", default=True, cast=bool):
        # Convenience default for local dev only.
        SECRET_KEY = "django-insecure-change-me-in-production"
    else:
        raise ImproperlyConfigured(
            "SECRET_KEY must be set via the environment (or .env) when DEBUG=False."
        )

DEBUG = config("DEBUG", default=True, cast=bool)
 
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# Render sets this automatically for every deploy; add it so the app works
# out of the box on Render without needing to hand-maintain ALLOWED_HOSTS.
RENDER_EXTERNAL_HOSTNAME = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)
 
 
# =============================================================================
# APPLICATION DEFINITION
# =============================================================================
 
INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
    
    # Third-party
    "crispy_forms",
    "crispy_tailwind",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "django_htmx",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    
    # Local apps
    "apps.accounts",
    "apps.marketplace",
    "apps.jobs",
    "apps.reviews",
    "apps.notifications",
    "apps.chat",
    "apps.moderation",
]
 
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django_htmx.middleware.HtmxMiddleware",
    "skillplug.middleware.SecurityHeadersMiddleware",
]
 
ROOT_URLCONF = "skillplug.urls"
 
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "apps.marketplace.context_processors.marketplace_stats",
            ],
        },
    },
]
 
WSGI_APPLICATION = "skillplug.wsgi.application"
ASGI_APPLICATION = "skillplug.asgi.application"
 
 
# =============================================================================
# DATABASE
# =============================================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="skillplug"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default="postgres"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432", cast=int),
        "CONN_MAX_AGE": config("DB_CONN_MAX_AGE", default=60, cast=int),
        "OPTIONS": {
            "connect_timeout": 10,
        },
    }
}
 
 
# =============================================================================
# AUTHENTICATION & ALLAUTH
# =============================================================================
 
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]
 
AUTH_USER_MODEL = "accounts.User"
 
# django-allauth settings
ACCOUNT_LOGIN_METHODS = {"email", "username"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "username*", "password1*", "password2*"]
ACCOUNT_USER_MODEL_USERNAME_FIELD = "username"
ACCOUNT_SIGNUP_REDIRECT_URL = "profile_create"
ACCOUNT_LOGOUT_ON_GET = True
ACCOUNT_LOGOUT_REDIRECT_URL = "/"
ACCOUNT_SESSION_REMEMBER = True
ACCOUNT_UNIQUE_EMAIL = True
  
LOGIN_REDIRECT_URL = "dashboard"
LOGOUT_REDIRECT_URL = "/"
LOGIN_URL = "account_login"
  
  
# =============================================================================
# INTERNATIONALIZATION
# =============================================================================
 
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
USE_I18N = True
USE_TZ = True
 
 
# =============================================================================
# STATIC & MEDIA FILES
# =============================================================================
 
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
_static_dir = BASE_DIR / "static"
STATICFILES_DIRS = [_static_dir] if _static_dir.exists() else []
 
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
 
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
 
 
# =============================================================================
# CRISPY FORMS
# =============================================================================
 
CRISPY_ALLOWED_TEMPLATE_PACKS = "tailwind"
CRISPY_TEMPLATE_PACK = "tailwind"
 
 
# =============================================================================
# EMAIL SETTINGS
# =============================================================================
 
EMAIL_BACKEND = (
    "django.core.mail.backends.console.EmailBackend"
    if DEBUG
    else "django.core.mail.backends.smtp.EmailBackend"
)
 
EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@skillplug.ng")
 
 
# =============================================================================
# MESSAGES
# =============================================================================
 
from django.contrib.messages import constants as messages
 
MESSAGE_TAGS = {
    messages.DEBUG: "debug",
    messages.INFO: "info",
    messages.SUCCESS: "success",
    messages.WARNING: "warning",
    messages.ERROR: "error",
}
 
 
# =============================================================================
# SECURITY
# =============================================================================
 
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
 
 
# =============================================================================
# DEFAULT PRIMARY KEY
# =============================================================================
 
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
 
 
# =============================================================================
# WHATSAPP SETTINGS
# =============================================================================
 
WHATSAPP_DEFAULT_MESSAGE = config(
    "WHATSAPP_DEFAULT_MESSAGE",
    default="Hello! I found you on SkillPlug and I'm interested in your services.",
)


# =============================================================================
# REST FRAMEWORK
# =============================================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour",
        "login": "10/hour",
        "register": "5/hour",
        "password_reset": "5/hour",
        "review": "20/hour",
        "apply": "20/hour",
        "message": "100/hour",
        "report": "10/hour",
    },
}


# =============================================================================
# SIMPLE JWT
# =============================================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# =============================================================================
# AUTH - PASSWORD VALIDATION
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "apps.accounts.validators.StrengthValidator",
    },
]


# =============================================================================
# CACHING
# =============================================================================

REDIS_URL = config("REDIS_URL", default="")

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "skillplug-dev-cache",
        }
    }


# =============================================================================
# CORS
# =============================================================================

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)

CORS_ALLOW_CREDENTIALS = True


# =============================================================================
# FRONTEND URL (for password reset email links)
# =============================================================================

FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")