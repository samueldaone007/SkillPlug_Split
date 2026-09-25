"""
Models for the jobs app.
Handles job postings and applications.
"""

from django.db import models
from django.urls import reverse
from django.conf import settings


class Job(models.Model):
    """
    Represents a job posting by a client.
    """
    
    # Status choices
    STATUS_CHOICES = [
        ("open", "Open"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("closed", "Closed"),
        ("draft", "Draft"),
    ]
    
    # Budget type
    BUDGET_TYPE_CHOICES = [
        ("fixed", "Fixed Price"),
        ("hourly", "Hourly Rate"),
        ("negotiable", "Negotiable"),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Budget
    budget_type = models.CharField(
        max_length=15,
        choices=BUDGET_TYPE_CHOICES,
        default="fixed",
    )
    budget_min = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Minimum budget in NGN",
    )
    budget_max = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Maximum budget in NGN",
    )
    budget_display = models.CharField(
        max_length=100,
        blank=True,
        help_text="Custom budget text (e.g., '₦5,000 - ₦10,000')",
    )
    
    # Relationships
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="jobs_posted",
    )
    
    # Required skills
    required_skills = models.ManyToManyField(
        "accounts.Skill",
        blank=True,
        related_name="jobs",
    )
    
    # Status
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default="open",
    )
    
    # Location preference
    location_preference = models.CharField(
        max_length=200,
        blank=True,
        help_text="Preferred location or 'Remote'",
    )
    
    # Contact
    contact_email = models.EmailField(blank=True)
    contact_whatsapp = models.CharField(max_length=20, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Job"
        verbose_name_plural = "Jobs"
    
    def __str__(self):
        return self.title
    
    def get_absolute_url(self):
        return reverse("job_detail", kwargs={"pk": self.pk})
    
    @property
    def application_count(self):
        return self.applications.count()
    
    @property
    def budget_string(self):
        """Return a formatted budget string."""
        if self.budget_display:
            return self.budget_display
        if self.budget_min and self.budget_max:
            return f"₦{self.budget_min:,.0f} - ₦{self.budget_max:,.0f}"
        elif self.budget_min:
            return f"From ₦{self.budget_min:,.0f}"
        elif self.budget_max:
            return f"Up to ₦{self.budget_max:,.0f}"
        return "Negotiable"


class Application(models.Model):
    """
    Represents a student's application to a job.
    """
    
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("invited", "Invited"),
    ]
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    message = models.TextField(
        help_text="Explain why you're a good fit for this job",
    )
    proposed_budget = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Your proposed budget (optional)",
    )
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default="pending",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        unique_together = ["student", "job"]
        verbose_name = "Application"
        verbose_name_plural = "Applications"
    
    def __str__(self):
        return f"{self.student.display_name} - {self.job.title}"