from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_user_is_suspended"),
    ]

    operations = [
        migrations.CreateModel(
            name="FreelancerNote",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("note", models.TextField(blank=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="freelancer_notes",
                        to="accounts.user",
                    ),
                ),
                (
                    "freelancer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes_from_clients",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "unique_together": {("user", "freelancer")},
            },
        ),
    ]