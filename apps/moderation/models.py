from django.conf import settings
from django.db import models


class Report(models.Model):
    """A user-submitted report about a profile or job."""

    TARGET_TYPE_CHOICES = [
        ("profile", "Profile"),
        ("job", "Job"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reports_made",
    )
    target_type = models.CharField(max_length=10, choices=TARGET_TYPE_CHOICES)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reports_received",
    )
    target_job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="reports_received",
    )
    reason = models.TextField()
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="pending"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderation_actions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Report #{self.pk} ({self.status})"

    def target(self):
        if self.target_type == "job":
            return self.target_job
        return self.target_user