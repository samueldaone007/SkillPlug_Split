"""
ASGI config for SkillPlug.

Routes HTTP to Django and websockets to the chat consumer.
Used by daphne (production) and runserver (dev).
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "skillplug.settings")

# Initialize Django ASGI application early to ensure the AppRegistry is
# populated before importing any code that may import ORM models.
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter

from apps.chat.routing import websocket_urlpatterns as chat_urlpatterns
from apps.notifications.routing import (
    websocket_urlpatterns as notification_urlpatterns,
)

websocket_urlpatterns = chat_urlpatterns + notification_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
    }
)