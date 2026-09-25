from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import notify

User = get_user_model()


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