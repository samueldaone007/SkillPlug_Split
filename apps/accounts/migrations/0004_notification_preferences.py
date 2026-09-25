# Generated manually - notification preferences (sound toggle + per-type opt-outs).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_verification_reject_reason"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="notification_sound_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Play a sound when new notifications arrive",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="notification_preferences",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Per-type opt-out map, e.g. {'review': False}",
            ),
        ),
    ]