from django.conf import settings
from django.db import models


class Notification(models.Model):
    """In-app notification for a user."""

    NOTIFICATION_TYPE_CHOICES = [
        ("verification", "Verification"),
        ("application", "Application"),
        ("review", "Review"),
        ("message", "Message"),
        ("system", "System"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    message = models.CharField(max_length=255)
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE_CHOICES,
        default="system",
    )
    link = models.CharField(max_length=255, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.message}"


def notify(user, message, notification_type="system", link=""):
    """Create an in-app notification for a user.

    Honours the user's per-type opt-out preferences.
    """
    if user is None:
        return None
    preferences = getattr(user, "notification_preferences", None) or {}
    if not preferences.get(notification_type, True):
        return None
    return Notification.objects.create(
        user=user,
        message=message,
        notification_type=notification_type,
        link=link,
    )