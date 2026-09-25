from django.contrib import admin

from .models import Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = [
        "id", "reporter", "target_type", "target_user", "target_job",
        "status", "created_at",
    ]
    list_filter = ["status", "target_type", "created_at"]
    search_fields = [
        "reason", "reporter__username", "reporter__email",
        "target_user__username", "target_job__title",
    ]
    readonly_fields = ["reporter", "created_at", "updated_at"]
    actions = ["mark_resolved", "mark_dismissed"]

    def mark_resolved(self, request, queryset):
        updated = queryset.update(status="resolved", resolved_by=request.user)
        self.message_user(request, f"{updated} report(s) marked as resolved.")

    mark_resolved.short_description = "Mark selected reports as resolved"

    def mark_dismissed(self, request, queryset):
        updated = queryset.update(status="dismissed", resolved_by=request.user)
        self.message_user(request, f"{updated} report(s) dismissed.")

    mark_dismissed.short_description = "Dismiss selected reports"