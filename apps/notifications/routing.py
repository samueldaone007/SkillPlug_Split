"""Websocket routes for realtime notifications."""

from django.urls import re_path

from apps.notifications import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/notifications/$",
        consumers.NotificationsConsumer.as_asgi(),
    ),
]