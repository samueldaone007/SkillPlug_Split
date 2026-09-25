"""
Realtime chat consumer.

The consumer does NOT save messages - sending stays on the REST API so
serialization, validation, throttling and notifications stay in one place.
The REST POST view broadcasts `chat_message` events onto this group, and
clients relayed `typing` foreground events back out to everyone connected.
"""

import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from django.contrib.auth import get_user_model

from apps.chat.models import Conversation

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.group_name = f"conversation_{self.conversation_id}"

        self.user = await self._authenticate()
        if self.user is None or not await self._is_participant():
            await self.close(code=4401)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        event_type = data.get("type")
        if event_type == "typing":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "chat_typing",
                    "sender_id": self.user.id,
                    "sender_name": self.user.display_name,
                },
            )

    async def chat_message(self, event):
        """Broadcast a message created by the REST API to the group."""
        await self.send(text_data=json.dumps(event["message"]))

    async def chat_typing(self, event):
        """Relay a typing indicator to everyone in the group."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "typing",
                    "sender_id": event["sender_id"],
                    "sender_name": event["sender_name"],
                }
            )
        )

    async def chat_read(self, event):
        """Relay read-receipt updates to everyone in the group."""
        await self.send(
            text_data=json.dumps(
                {
                    "type": "chat.read",
                    "message_ids": event["message_ids"],
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

    @database_sync_to_async
    def _is_participant(self):
        conversation = Conversation.objects.filter(
            pk=self.conversation_id
        ).first()
        if conversation is None:
            return False
        return self.user in (conversation.user_a, conversation.user_b)