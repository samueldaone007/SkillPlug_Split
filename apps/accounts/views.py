"""
Views for the accounts app.
Handles registration, profile management, and authentication flows.
"""
 
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import (
    LoginView,
    LogoutView,
    PasswordResetView,
    PasswordResetDoneView,
    PasswordResetConfirmView,
    PasswordResetCompleteView,
)
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from django.views.generic import CreateView, UpdateView, DetailView
 
from .forms import (
    CustomLoginForm,
    CustomSignupForm,
    ProfileCreateForm,
    ProfileUpdateForm,
    CustomPasswordResetForm,
    CustomSetPasswordForm,
)
from .models import User
 
 
class CustomLoginView(LoginView):
    """Custom login view with Tailwind-styled form."""
    template_name = "accounts/login.html"
    form_class = CustomLoginForm
    redirect_authenticated_user = True
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Sign In"
        return context
 
 
class CustomLogoutView(LogoutView):
    """Logout and redirect to home."""
    next_page = "home"
    http_method_names = ["get", "post"]
    
    def dispatch(self, request, *args, **kwargs):
        messages.success(request, "You have been logged out successfully.")
        return super().dispatch(request, *args, **kwargs)
 
 
class SignupView(CreateView):
    """User registration view."""
    form_class = CustomSignupForm
    template_name = "accounts/signup.html"
    success_url = reverse_lazy("profile_create")
    
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return redirect("dashboard")
        return super().dispatch(request, *args, **kwargs)
    
    def form_valid(self, form):
        response = super().form_valid(form)
        login(self.request, self.object, backend="django.contrib.auth.backends.ModelBackend")
        messages.success(
            self.request,
            "Welcome to SkillPlug! Please complete your profile to get started."
        )
        return response
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Get Started"
        return context
 
 
class ProfileCreateView(UpdateView):
    """Profile completion after signup."""
    model = User
    form_class = ProfileCreateForm
    template_name = "accounts/profile_create.html"
    success_url = reverse_lazy("dashboard")
    
    def get_object(self, queryset=None):
        return self.request.user
    
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("account_login")
        if request.user.profile_complete:
            messages.info(request, "Your profile is already complete.")
            return redirect("dashboard")
        return super().dispatch(request, *args, **kwargs)
    
    def form_valid(self, form):
        if "verification_doc" in self.request.FILES:
            user = self.request.user
            user.verification_requested = True
            user.verified = False
            user.verification_date = None
            user.verification_reject_reason = None
            user.save(update_fields=[
                "verification_requested", "verified",
                "verification_date", "verification_reject_reason",
            ])
        messages.success(
            self.request,
            "Profile created successfully! Welcome to SkillPlug."
        )
        return super().form_valid(form)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Complete Your Profile"
        context["step"] = 1
        return context
 
 
class ProfileUpdateView(UpdateView):
    """Edit existing profile."""
    model = User
    form_class = ProfileUpdateForm
    template_name = "accounts/profile_edit.html"
    success_url = reverse_lazy("dashboard")
    
    def get_object(self, queryset=None):
        return self.request.user
    
    def form_valid(self, form):
        if "verification_doc" in self.request.FILES:
            user = self.request.user
            user.verification_requested = True
            user.verified = False
            user.verification_date = None
            user.verification_reject_reason = None
            user.save(update_fields=[
                "verification_requested", "verified",
                "verification_date", "verification_reject_reason",
            ])
        messages.success(self.request, "Profile updated successfully!")
        return super().form_valid(form)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Edit Profile"
        return context
 
 
class ProfileDetailView(DetailView):
    """Public freelancer profile view."""
    model = User
    template_name = "accounts/profile_detail.html"
    context_object_name = "freelancer"
    slug_field = "username"
    slug_url_kwarg = "username"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        freelancer = self.object
        
        # Get portfolio items
        context["portfolio_items"] = freelancer.portfolio_items.all()[:6]
        
        # Get reviews
        context["reviews"] = freelancer.reviews_received.all().select_related("reviewer")
        
        # Calculate average rating
        reviews = freelancer.reviews_received.all()
        if reviews:
            context["avg_rating"] = round(
                sum(r.rating for r in reviews) / len(reviews), 1
            )
            context["review_count"] = len(reviews)
        else:
            context["avg_rating"] = 0
            context["review_count"] = 0
        
        # Check if saved (for authenticated users)
        if self.request.user.is_authenticated:
            context["is_saved"] = freelancer.saved_by.filter(
                id=self.request.user.id
            ).exists()
        else:
            context["is_saved"] = False
        
        context["title"] = f"{freelancer.display_name} - SkillPlug"
        return context
 
 
class DashboardView(DetailView):
    """User dashboard with overview of activity."""
    model = User
    template_name = "accounts/dashboard.html"
    context_object_name = "user"
    
    def get_object(self, queryset=None):
        return self.request.user
    
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("account_login")
        return super().dispatch(request, *args, **kwargs)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        # Portfolio count
        context["portfolio_count"] = user.portfolio_items.count()
        
        # Job applications
        context["my_applications"] = user.applications.all().select_related("job")[:5]
        
        # Posted jobs (for clients)
        context["my_jobs"] = user.jobs_posted.all()[:5]
        
        # Reviews
        context["my_reviews"] = user.reviews_received.all().select_related("reviewer")[:5]
        
        # Saved freelancers
        context["saved_count"] = user.saved_freelancers.count()
        
        # Recommended freelancers (same school or skills)
        if user.skills.exists():
            context["recommended"] = User.objects.filter(
                skills__in=user.skills.all(),
                availability_status="available",
                profile_complete=True,
            ).exclude(id=user.id).distinct()[:4]
        else:
            context["recommended"] = User.objects.filter(
                availability_status="available",
                profile_complete=True,
            ).exclude(id=user.id)[:4]
        
        context["title"] = "Dashboard"
        return context
 
 
@login_required
def toggle_save_freelancer(request, username):
    """Toggle saving/unsaving a freelancer."""
    freelancer = get_object_or_404(User, username=username)
    
    if request.user.saved_freelancers.filter(id=freelancer.id).exists():
        request.user.saved_freelancers.remove(freelancer)
        messages.success(request, f"Removed {freelancer.display_name} from saved.")
    else:
        request.user.saved_freelancers.add(freelancer)
        messages.success(request, f"Saved {freelancer.display_name}!")
    
    if request.headers.get("HX-Request"):
        return render(request, "partials/save_button.html", {
            "freelancer": freelancer,
            "is_saved": request.user.saved_freelancers.filter(id=freelancer.id).exists(),
        })
    
    return redirect("freelancer_detail", username=username)
 
 
@login_required
def saved_freelancers_list(request):
    """View saved freelancers."""
    freelancers = request.user.saved_freelancers.filter(
        profile_complete=True
    ).prefetch_related("skills")
    
    context = {
        "freelancers": freelancers,
        "title": "Saved Freelancers",
    }
    return render(request, "accounts/saved_freelancers.html", context)
 
 
@login_required
def toggle_dark_mode(request):
    """Toggle dark mode preference."""
    request.user.dark_mode = not request.user.dark_mode
    request.user.save(update_fields=["dark_mode"])
    
    response = redirect(request.META.get("HTTP_REFERER", "home"))
    return response


@login_required
def request_verification(request):
    """Queue the logged-in student's ID for admin verification."""
    user = request.user
    if not user.is_student:
        messages.error(request, "Only students can request verification.")
        return redirect("dashboard")

    if user.verified:
        messages.info(request, "You are already verified.")
        return redirect("dashboard")

    if not user.verification_doc:
        messages.error(request, "Upload your student ID first, then request verification.")
        return redirect("profile_edit")

    user.verification_requested = True
    user.verification_reject_reason = None
    user.save(update_fields=["verification_requested", "verification_reject_reason"])
    messages.success(
        request,
        "Verification request submitted! An admin will review your student ID shortly.",
    )
    return redirect("dashboard")
 
 
# Password Reset Views
class CustomPasswordResetView(PasswordResetView):
    template_name = "accounts/password_reset.html"
    form_class = CustomPasswordResetForm
    email_template_name = "accounts/password_reset_email.html"
    success_url = reverse_lazy("password_reset_done")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Reset Password"
        return context
 
 
class CustomPasswordResetDoneView(PasswordResetDoneView):
    template_name = "accounts/password_reset_done.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Check Your Email"
        return context
 
 
class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    template_name = "accounts/password_reset_confirm.html"
    form_class = CustomSetPasswordForm
    success_url = reverse_lazy("password_reset_complete")
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Set New Password"
        return context
 
 
class CustomPasswordResetCompleteView(PasswordResetCompleteView):
    template_name = "accounts/password_reset_complete.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["title"] = "Password Reset Complete"
        return context