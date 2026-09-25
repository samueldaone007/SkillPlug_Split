"""
Models for the reviews app.
Handles freelancer ratings and reviews.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings


class Review(models.Model):
    """
    Represents a review/rating left by a client for a freelancer.
    """
    
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_given",
    )
    freelancer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_received",
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rate from 1 to 5 stars",
    )
    comment = models.TextField(
        blank=True,
        help_text="Share your experience working with this freelancer",
    )
    reply = models.TextField(
        blank=True,
        help_text="Freelancer's reply to this review",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        unique_together = ["reviewer", "freelancer"]
        verbose_name = "Review"
        verbose_name_plural = "Reviews"
    
    def __str__(self):
        return f"{self.reviewer.display_name} -> {self.freelancer.display_name}: {self.rating} stars"
    
    @property
    def rating_stars(self):
        """Return a list of filled and empty stars for display."""
        return {
            "filled": range(self.rating),
            "empty": range(5 - self.rating),
        }
