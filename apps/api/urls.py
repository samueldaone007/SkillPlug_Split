"""
URL configuration for the SkillPlug REST API.
All endpoints are prefixed with /api/v1/.
"""

from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

from . import views

urlpatterns = [
    # Health check (uptime monitors)
    path("health/", views.HealthCheckView.as_view(), name="api_health"),

    # Authentication
    path("auth/register/", views.RegisterView.as_view(), name="api_register"),
    path("auth/login/", views.ThrottledLoginView.as_view(), name="api_token_obtain"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="api_token_refresh"),
    path("auth/profile/", views.ProfileView.as_view(), name="api_profile"),
    path("auth/password-reset/", views.PasswordResetRequestView.as_view(), name="api_password_reset"),
    path(
        "auth/password-reset/confirm/<str:uidb64>/<str:token>/",
        views.PasswordResetConfirmViewAPI.as_view(),
        name="api_password_reset_confirm",
    ),

    # Users
    path("users/saved/", views.SavedFreelancersView.as_view(), name="api_saved_freelancers"),
    path("users/<str:username>/", views.PublicProfileView.as_view(), name="api_user_detail"),
    path("users/<str:username>/save/", views.ToggleSaveFreelancerView.as_view(), name="api_toggle_save"),
    path("users/<str:username>/portfolio/", views.UserPortfolioView.as_view(), name="api_user_portfolio"),

    # Dashboard
    path("dashboard/", views.DashboardView.as_view(), name="api_dashboard"),

    # Dark mode
    path("toggle-dark-mode/", views.ToggleDarkModeView.as_view(), name="api_toggle_dark_mode"),

    # Skills
    path("skills/", views.SkillListView.as_view(), name="api_skill_list"),

    # Freelancers / Marketplace
    path("freelancers/", views.FreelancerListView.as_view(), name="api_freelancer_list"),
    path("home/", views.HomeView.as_view(), name="api_home"),

    # Jobs
    path("jobs/", views.JobListView.as_view(), name="api_job_list"),
    path("jobs/create/", views.JobCreateView.as_view(), name="api_job_create"),
    path("jobs/<int:pk>/", views.JobDetailView.as_view(), name="api_job_detail"),
    path("jobs/<int:pk>/apply/", views.ApplyJobView.as_view(), name="api_job_apply"),
    path("jobs/<int:pk>/applications/", views.JobApplicationsView.as_view(), name="api_job_applications"),
    path("jobs/<int:pk>/status/<str:app_status>/", views.UpdateApplicationStatusView.as_view(), name="api_application_status"),
    path("jobs/my-jobs/", views.MyJobsView.as_view(), name="api_my_jobs"),
    path("jobs/my-applications/", views.MyApplicationsView.as_view(), name="api_my_applications"),

    # Portfolio
    path("portfolio/", views.PortfolioListCreateView.as_view(), name="api_portfolio_list"),
    path("portfolio/<int:pk>/", views.PortfolioDetailView.as_view(), name="api_portfolio_detail"),

    # Reviews
    path("reviews/<str:username>/", views.FreelancerReviewsView.as_view(), name="api_reviews"),
    path("reviews/<str:username>/create/", views.CreateReviewView.as_view(), name="api_create_review"),
]