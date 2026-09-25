from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Notification, notify

User = get_user_model()


@receiver(post_save, sender=Notification)
def push_notification_to_user(sender, instance, created, **kwargs):
    """Realtime push of a fresh notification onto the user's websocket group.

    The frontend NotificationsContext opens a `/ws/notifications/` socket and
    refreshes instantly when this event arrives; the REST poll remains as a
    fallback.
    """
    if not created or instance.user_id is None:
        return
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
    except Exception:
        return
    if channel_layer is None:
        return

    payload = {
        "id": instance.id,
        "message": instance.message,
        "notification_type": instance.notification_type,
        "link": instance.link,
        "is_read": instance.is_read,
        "created_at": instance.created_at.isoformat() if instance.created_at else None,
    }
    try:
        async_to_sync(channel_layer.group_send)(
            f"user_{instance.user_id}",
            {"type": "notification.message", "notification": payload},
        )
    except Exception:
        # The push is best-effort; the REST poll still picks the row up.
        pass


@receiver(pre_save, sender=User)
def stash_previous_verification_requested(sender, instance, **kwargs):
    if instance.pk is None:
        instance._previous_verification_requested = False
        return
    previous = User.objects.filter(pk=instance.pk).values_list(
        "verification_requested", flat=True
    ).first()
    instance._previous_verification_requested = bool(previous)


@receiver(post_save, sender=User)
def notify_staff_on_new_verification_request(sender, instance, **kwargs):
    previous = getattr(instance, "_previous_verification_requested", False)
    if not (instance.verification_requested and not previous):
        return

    staff = User.objects.filter(is_staff=True, is_active=True).exclude(
        pk=instance.pk
    )
    for admin_user in staff:
        notify(
            admin_user,
            f"{instance.display_name} (@{instance.username}) submitted a verification request.",
            notification_type="verification",
            link="/admin/verifications",
        )