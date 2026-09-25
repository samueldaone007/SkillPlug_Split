"""
URL configuration for the accounts app.
"""

from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path("login/", views.CustomLoginView.as_view(), name="account_login"),
    path("logout/", views.CustomLogoutView.as_view(), name="account_logout"),
    path("signup/", views.SignupView.as_view(), name="account_signup"),
    
    # Profile management
    path("profile/create/", views.ProfileCreateView.as_view(), name="profile_create"),
    path("profile/edit/", views.ProfileUpdateView.as_view(), name="profile_edit"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    
    # Freelancer profile (public)
    path("@<str:username>/", views.ProfileDetailView.as_view(), name="freelancer_detail"),
    
    # Saved freelancers
    path("saved/", views.saved_freelancers_list, name="saved_freelancers"),
    path("@<str:username>/save/", views.toggle_save_freelancer, name="toggle_save"),
    
    # Dark mode
    path("toggle-dark-mode/", views.toggle_dark_mode, name="toggle_dark_mode"),

    # Verification
    path("verification/request/", views.request_verification, name="request_verification"),
    
    # Password reset
    path("password-reset/", views.CustomPasswordResetView.as_view(), name="password_reset"),
    path(
        "password-reset/done/",
        views.CustomPasswordResetDoneView.as_view(),
        name="password_reset_done",
    ),
    path(
        "password-reset-confirm/<uidb64>/<token>/",
        views.CustomPasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(
        "password-reset-complete/",
        views.CustomPasswordResetCompleteView.as_view(),
        name="password_reset_complete",
    ),
]
