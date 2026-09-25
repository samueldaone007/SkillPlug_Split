# Generated manually - adds verification_requested flag for the
# student-facing verification request flow.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="verification_requested",
            field=models.BooleanField(
                default=False,
                help_text="Student has submitted a verification request awaiting admin review",
            ),
        ),
    ]