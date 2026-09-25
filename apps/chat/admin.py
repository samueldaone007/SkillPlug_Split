from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ["sender", "body", "is_read", "created_at"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "user_a", "user_b", "updated_at"]
    search_fields = ["user_a__username", "user_a__email", "user_b__username", "user_b__email"]
    list_filter = ["created_at"]
    readonly_fields = ["user_a", "user_b", "created_at"]
    inlines = [MessageInline]