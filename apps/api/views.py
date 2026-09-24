"""
API views for the SkillPlug REST API.
All endpoints that the React frontend consumes.
"""

from django.db.models import Avg, Count, Q
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Skill, User
from apps.jobs.models import Job, Application
from apps.marketplace.models import PortfolioItem
from apps.reviews.models import Review

from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    UserPublicSerializer,
    DashboardSerializer,
    SkillSerializer,
    JobSerializer,
    JobCreateSerializer,
    ApplicationSerializer,
    ApplicationCreateSerializer,
    PortfolioItemSerializer,
    ReviewSerializer,
    ReviewCreateSerializer,
)


# =============================================================================
# PERMISSIONS
# =============================================================================

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.posted_by == request.user or request.user.is_staff


class IsOwnerOfPortfolio(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.user == request.user


# =============================================================================
# AUTH
# =============================================================================

from rest_framework_simplejwt.views import TokenObtainPairView as BaseTokenObtainPairView


class ThrottledLoginView(BaseTokenObtainPairView):
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "login"


class HealthCheckView(APIView):
    """
    Liveness probe for uptime monitors / load balancers.
    Deliberately does not touch the database so it stays responsive even
    during brief DB hiccups.
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        return Response({
            "user": UserProfileSerializer(user, context={"request": request}).data,
            "tokens": {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()
    lookup_field = "username"


class UserPortfolioView(generics.ListAPIView):
    serializer_class = PortfolioItemSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return PortfolioItem.objects.filter(
            user__username=self.kwargs["username"]
        ).select_related("user")


# =============================================================================
# DASHBOARD
# =============================================================================

class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(
            DashboardSerializer(request.user, context={"request": request}).data
        )


# =============================================================================
# SAVED FREELANCERS
# =============================================================================

class ToggleSaveFreelancerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        try:
            freelancer = User.objects.get(username=username, profile_complete=True)
        except User.DoesNotExist:
            return Response(
                {"error": "Freelancer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.saved_freelancers.filter(id=freelancer.id).exists():
            request.user.saved_freelancers.remove(freelancer)
            saved = False
        else:
            request.user.saved_freelancers.add(freelancer)
            saved = True

        return Response({"saved": saved})


class SavedFreelancersView(generics.ListAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.saved_freelancers.filter(
            profile_complete=True
        ).prefetch_related("skills")


# =============================================================================
# SKILLS
# =============================================================================

class SkillListView(generics.ListAPIView):
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Skill.objects.filter(is_active=True)
    pagination_class = None


# =============================================================================
# FREELANCERS / MARKETPLACE
# =============================================================================

class FreelancerListView(generics.ListAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = User.objects.filter(
            profile_complete=True,
        ).prefetch_related("skills").annotate(
            avg_rating_val=Avg("reviews_received__rating"),
            review_count_val=Count("reviews_received"),
        )

        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(bio__icontains=search) |
                Q(department__icontains=search) |
                Q(skills__name__icontains=search)
            ).distinct()

        school = self.request.query_params.get("school", "")
        if school:
            qs = qs.filter(school=school)

        skill = self.request.query_params.get("skill", "")
        if skill:
            qs = qs.filter(skills__name=skill)

        availability = self.request.query_params.get("availability", "")
        if availability:
            qs = qs.filter(availability_status=availability)

        if self.request.query_params.get("verified") == "true":
            qs = qs.filter(verified=True)

        sort = self.request.query_params.get("sort", "recent")
        if sort == "rating":
            qs = qs.order_by("-avg_rating_val")
        elif sort == "name":
            qs = qs.order_by("full_name")
        else:
            qs = qs.order_by("-date_joined")

        return qs


class HomeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        featured = User.objects.filter(
            verified=True,
            availability_status="available",
            profile_complete=True,
        ).select_related().prefetch_related("skills")[:6]

        top_rated = User.objects.filter(
            profile_complete=True,
            reviews_received__isnull=False,
        ).annotate(
            avg_rating_val=Avg("reviews_received__rating"),
            review_count_val=Count("reviews_received"),
        ).order_by("-avg_rating_val")[:4]

        recent = User.objects.filter(
            profile_complete=True,
        ).select_related().prefetch_related("skills")[:4]

        skills = Skill.objects.filter(is_active=True)[:12]

        ctx = {"request": request}
        data = {
            "featured": UserPublicSerializer(featured, many=True, context=ctx).data,
            "top_rated": UserPublicSerializer(top_rated, many=True, context=ctx).data,
            "recent": UserPublicSerializer(recent, many=True, context=ctx).data,
            "total_freelancers": User.objects.filter(profile_complete=True).count(),
            "verified_freelancers": User.objects.filter(profile_complete=True, verified=True).count(),
            "total_skills": Skill.objects.filter(is_active=True).count(),
            "skills": SkillSerializer(skills, many=True).data,
            "universities": User.NIGERIAN_UNIVERSITIES[:8],
        }

        return Response(data)


# =============================================================================
# JOBS
# =============================================================================

class JobListView(generics.ListAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Job.objects.filter(
            is_active=True,
            status__in=["open", "in_progress"],
        ).select_related("posted_by").prefetch_related("required_skills").annotate(
            _application_count=Count("applications"),
        )

        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(required_skills__name__icontains=search)
            ).distinct()

        budget_type = self.request.query_params.get("budget_type", "")
        if budget_type:
            qs = qs.filter(budget_type=budget_type)

        skill = self.request.query_params.get("skill", "")
        if skill:
            qs = qs.filter(required_skills__name=skill)

        return qs.order_by("-created_at")


class JobCreateView(generics.CreateAPIView):
    serializer_class = JobCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class JobDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        return Job.objects.select_related("posted_by").prefetch_related(
            "required_skills"
        ).annotate(_application_count=Count("applications"))

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return JobCreateSerializer
        return JobSerializer


class MyJobsView(generics.ListAPIView):
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Job.objects.filter(
            posted_by=self.request.user,
        ).annotate(
            _application_count=Count("applications"),
        ).order_by("-created_at")


class MyApplicationsView(generics.ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(
            student=self.request.user,
        ).select_related("job").order_by("-created_at")


class ApplyJobView(generics.CreateAPIView):
    serializer_class = ApplicationCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "apply"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["job"] = get_object_or_404(Job, pk=self.kwargs["pk"])
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Application submitted successfully!"},
            status=status.HTTP_201_CREATED,
        )


class UpdateApplicationStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, app_status):
        if app_status not in ["accepted", "rejected", "pending"]:
            return Response(
                {"error": "Invalid status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            application = Application.objects.select_related("job").get(pk=pk)
        except Application.DoesNotExist:
            return Response(
                {"error": "Application not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if application.job.posted_by != request.user and not request.user.is_staff:
            return Response(
                {"error": "You are not authorized to update this application."},
                status=status.HTTP_403_FORBIDDEN,
            )

        application.status = app_status
        application.save(update_fields=["status"])

        return Response({"detail": f"Application {app_status}."})


class JobApplicationsView(generics.ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        job = get_object_or_404(Job, pk=self.kwargs["pk"])
        if job.posted_by != self.request.user and not self.request.user.is_staff:
            return Application.objects.none()
        return Application.objects.filter(job=job).select_related("student")


# =============================================================================
# PORTFOLIO
# =============================================================================

class PortfolioListCreateView(generics.ListCreateAPIView):
    serializer_class = PortfolioItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return PortfolioItem.objects.filter(user=self.request.user)
        return PortfolioItem.objects.none()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class PortfolioDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PortfolioItemSerializer
    permission_classes = [IsOwnerOfPortfolio]
    queryset = PortfolioItem.objects.all()


# =============================================================================
# REVIEWS
# =============================================================================

class FreelancerReviewsView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        freelancer = get_object_or_404(
            User,
            username=self.kwargs["username"],
        )
        return Review.objects.filter(
            freelancer=freelancer
        ).select_related("reviewer")


class CreateReviewView(generics.CreateAPIView):
    serializer_class = ReviewCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "review"

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["freelancer"] = get_object_or_404(
            User,
            username=self.kwargs["username"],
            profile_complete=True,
        )
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Review submitted successfully!"},
            status=status.HTTP_201_CREATED,
        )


# =============================================================================
# DARK MODE
# =============================================================================

class ToggleDarkModeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.dark_mode = not request.user.dark_mode
        request.user.save(update_fields=["dark_mode"])
        return Response({"dark_mode": request.user.dark_mode})


# =============================================================================
# PASSWORD RESET
# =============================================================================

class APIPasswordResetForm(PasswordResetForm):
    """PasswordResetForm that sends a link to the React frontend."""

    def get_email_context(self, user):
        context = super().get_email_context(user)
        context["frontend_url"] = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        return context


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "password_reset"

    def post(self, request):
        form = APIPasswordResetForm(data={"email": request.data.get("email", "")})
        if form.is_valid():
            form.save(
                request=request,
                email_template_name="accounts/password_reset_email.html",
                subject_template_name="accounts/password_reset_subject.txt",
            )
        return Response(
            {"detail": "If an account exists with that email, a password reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmViewAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def validate_uidb64(self, uidb64):
        from django.utils.encoding import force_str
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User._default_manager.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, self.request.data.get("token", "")):
            return user
        return None

    def post(self, request, uidb64, token):
        user = self.validate_uidb64(uidb64)
        if user is None:
            return Response(
                {"detail": "The password reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_password = request.data.get("new_password", "")
        form = SetPasswordForm(user=user, data={"new_password1": new_password, "new_password2": request.data.get("new_password2", "")})
        if form.is_valid():
            form.save()
            return Response({"detail": "Your password has been reset successfully."})
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)