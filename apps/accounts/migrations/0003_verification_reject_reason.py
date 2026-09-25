# Generated manually - adds verification_reject_reason for the
# reject-with-reason flow in the React admin queue.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_verification_requested"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="verification_reject_reason",
            field=models.TextField(
                blank=True,
                null=True,
                help_text="Why the student's verification request was rejected (shown to the student)",
            ),
        ),
    ]