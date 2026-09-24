"""
SkillPlug URL Configuration
"""
 
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
 
from apps.marketplace.views import HomeView
 
urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    
    # REST API
    path("api/v1/", include("apps.api.urls")),
    
    # Home
    path("", HomeView.as_view(), name="home"),
    
    # App URLs
    path("accounts/", include("apps.accounts.urls")),
    path("accounts/", include("allauth.urls")),
    path("marketplace/", include("apps.marketplace.urls")),
    path("jobs/", include("apps.jobs.urls")),
    path("reviews/", include("apps.reviews.urls")),

]
 
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)