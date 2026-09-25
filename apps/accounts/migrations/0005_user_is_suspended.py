from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_notification_preferences"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_suspended",
            field=models.BooleanField(default=False),
        ),
    ]