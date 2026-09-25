from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """A 1:1 private thread between two users."""

    user_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_as_a",
    )
    user_b = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations_as_b",
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user_a", "user_b"],
                name="unique_conversation_pair",
            )
        ]

    def __str__(self):
        return f"{self.user_a} <-> {self.user_b}"

    @classmethod
    def get_or_create_for_pair(cls, user1, user2):
        low, high = sorted([user1, user2], key=lambda u: u.id)
        conversation, created = cls.objects.get_or_create(
            user_a=low, user_b=high
        )
        return conversation, created

    def other(self, user):
        return self.user_b if user == self.user_a else self.user_a


class Message(models.Model):
    """A single message inside a conversation."""

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages_sent",
    )
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.sender} -> {self.conversation}"