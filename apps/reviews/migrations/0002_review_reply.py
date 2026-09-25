from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reviews", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="reply",
            field=models.TextField(
                blank=True,
                help_text="Freelancer's reply to this review",
            ),
        ),
    ]