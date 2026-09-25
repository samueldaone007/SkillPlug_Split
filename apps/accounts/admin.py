"""
Django Admin configuration for the accounts app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, Skill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ["name", "description", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)} if hasattr(Skill, "slug") else {}
    ordering = ["name"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        "username",
        "email",
        "full_name",
        "school_display",
        "verification_status",
        "verification_requested",
        "availability_status",
        "profile_complete",
        "date_joined",
    ]
    list_filter = [
        "verified",
        "verification_requested",
        "profile_complete",
        "availability_status",
        "school",
        "account_type",
        "is_staff",
        "date_joined",
    ]
    search_fields = [
        "username",
        "email",
        "full_name",
        "school",
        "department",
        "whatsapp",
    ]
    readonly_fields = [
        "date_joined",
        "updated_at",
        "verification_date",
        "verification_status",
        "profile_image_preview",
        "verification_doc_preview",
    ]
    ordering = ["-date_joined"]
    
    fieldsets = (
        (None, {"fields": ("username", "email", "password")}),
        ("Personal Info", {
            "fields": (
                "full_name",
                "profile_image_preview",
                "profile_image",
                "bio",
            ),
        }),
        ("Student Info", {
            "fields": (
                "school",
                "department",
                "skills",
                "account_type",
            ),
        }),
        ("Contact", {
            "fields": ("whatsapp",),
        }),
        ("Status", {
            "fields": (
                "availability_status",
                "verified",
                "profile_complete",
                "dark_mode",
            ),
        }),
        ("Verification", {
            "fields": (
                "verification_status",
                "verification_requested",
                "verification_doc_preview",
                "verification_doc",
                "verification_date",
            ),
            "classes": ("collapse",),
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            ),
            "classes": ("collapse",),
        }),
        ("Important Dates", {
            "fields": ("last_login", "date_joined", "updated_at"),
            "classes": ("collapse",),
        }),
    )
    
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "password1", "password2"),
        }),
    )
    
    filter_horizontal = ["skills", "groups", "user_permissions"]
    
    def profile_image_preview(self, obj):
        if obj.profile_image:
            return format_html(
                '<img src="{}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%;" />',
                obj.profile_image.url
            )
        return format_html('<span style="color: #999;">No image</span>')
    profile_image_preview.short_description = "Profile Preview"
    
    def verification_doc_preview(self, obj):
        if obj.verification_doc:
            return format_html(
                '<img src="{}" style="width: 200px; height: auto; border-radius: 8px;" />',
                obj.verification_doc.url
            )
        return format_html('<span style="color: #999;">No document uploaded</span>')
    verification_doc_preview.short_description = "ID Document"
    
    def school_display(self, obj):
        return obj.school_display
    school_display.short_description = "School"

    def verification_status(self, obj):
        status = obj.verification_status
        if status == "verified":
            color = "#16a34a"
            label = "Verified"
        elif status == "pending":
            color = "#ca8a04"
            label = "Pending Review"
        else:
            color = "#6b7280"
            label = "Not Requested"
        return format_html('<span style="color: {}; font-weight: 600;">{}</span>', color, label)
    verification_status.short_description = "Verification"

    actions = ["verify_students", "reject_verification_requests", "unverify_students",
               "mark_available", "mark_busy"]

    @admin.action(description="Verify selected students")
    def verify_students(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            verified=True,
            verification_requested=False,
            verification_date=timezone.now(),
        )
        self.message_user(request, f"{updated} student(s) verified successfully.")

    @admin.action(description="Reject selected verification requests")
    def reject_verification_requests(self, request, queryset):
        updated = queryset.update(
            verification_requested=False,
            verified=False,
            verification_date=None,
        )
        self.message_user(request, f"{updated} verification request(s) rejected.")
    
    @admin.action(description="Unverify selected students")
    def unverify_students(self, request, queryset):
        updated = queryset.update(verified=False, verification_date=None)
        self.message_user(request, f"{updated} student(s) unverified.")
    
    @admin.action(description="Mark as available")
    def mark_available(self, request, queryset):
        updated = queryset.update(availability_status="available")
        self.message_user(request, f"{updated} user(s) marked as available.")
    
    @admin.action(description="Mark as busy")
    def mark_busy(self, request, queryset):
        updated = queryset.update(availability_status="busy")
        self.message_user(request, f"{updated} user(s) marked as busy.")