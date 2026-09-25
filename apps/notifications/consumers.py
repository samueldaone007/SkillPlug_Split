"""Realtime notification consumer.

Each authenticated user gets a personal `user_<id>` group. New Notification
rows are pushed there by `apps.notifications.signals`; this consumer relays
them to the connected browser so the badge/panel update instantly.
"""

import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()

PRESENCE_TTL_SECONDS = 45


class NotificationsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self._authenticate()
        if self.user is None:
            await self.close(code=4401)
            return

        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        cache.set(f"presence:{self.user.id}", True, PRESENCE_TTL_SECONDS)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        cache.delete(f"presence:{self.user.id}")

    async def receive(self, text_data=None, bytes_data=None):
        # Heartbeat keeps the user marked online while the tab is open.
        if text_data:
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                return
            if data.get("type") == "ping":
                cache.set(f"presence:{self.user.id}", True, PRESENCE_TTL_SECONDS)

    async def notification_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "notification": event["notification"],
                }
            )
        )

    @database_sync_to_async
    def _authenticate(self):
        from rest_framework_simplejwt.tokens import AccessToken

        query = parse_qs(self.scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]
        if not token:
            return None
        try:
            payload = AccessToken(token)
            user = User.objects.get(pk=payload["user_id"])
            if getattr(user, "is_suspended", False):
                return None
            return user
        except Exception:
            return None