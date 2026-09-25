"""
API views for the SkillPlug REST API.
All endpoints that the React frontend consumes.
"""

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from asgiref.sync import async_to_sync
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Skill, User, FreelancerNote
from apps.chat.models import Conversation, Message
from apps.jobs.models import Job, Application
from apps.marketplace.models import PortfolioItem
from apps.moderation.models import Report
from apps.notifications.models import Notification, notify
from apps.reviews.models import Review

from .serializers import (
    RegisterSerializer,
    UserProfileSerializer,
    UserPublicSerializer,
    AdminVerificationSerializer,
    NotificationSerializer,
    DashboardSerializer,
    SkillSerializer,
    JobSerializer,
    JobCreateSerializer,
    ApplicationSerializer,
    ApplicationCreateSerializer,
    PortfolioItemSerializer,
    ReviewSerializer,
    ReviewCreateSerializer,
    ConversationSerializer,
    MessageSerializer,
    ReportCreateSerializer,
    ReportSerializer,
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
# ADMIN - STUDENT VERIFICATION
# =============================================================================

class VerificationQueueView(generics.ListAPIView):
    """
    Pending student verification requests for the React admin UI.
    Staff only.
    """
    serializer_class = AdminVerificationSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(
            account_type__in=["student", "both"],
            verification_requested=True,
            verified=False,
        ).order_by("updated_at")


class VerificationDecisionView(APIView):
    """
    Approve or reject a pending verification request.
    Body: {"action": "verify" | "reject"}
    Staff only.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        action = request.data.get("action")
        if action not in ["verify", "reject"]:
            return Response(
                {"error": "Invalid action. Use 'verify' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=pk, account_type__in=["student", "both"])
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action == "verify":
            user.verified = True
            user.verification_requested = False
            user.verification_date = timezone.now()
            user.verification_reject_reason = None
            notify(
                user,
                "Your student ID was verified — you're now a verified student!",
                notification_type="verification",
                link=f"/u/{user.username}",
            )
        else:
            reason = (request.data.get("reason") or "").strip()
            user.verified = False
            user.verification_requested = False
            user.verification_date = None
            user.verification_reject_reason = reason or None
            notify(
                user,
                f"Your verification request was rejected.{' Reason: ' + reason if reason else ''}",
                notification_type="verification",
                link="/profile/edit",
            )
        user.save(update_fields=[
            "verified", "verification_requested",
            "verification_date", "verification_reject_reason",
        ])

        return Response(
            AdminVerificationSerializer(user, context={"request": request}).data
        )


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
            notify(
                freelancer,
                f"{request.user.display_name} saved your profile.",
                notification_type="system",
                link=f"/u/{request.user.username}",
            )

        return Response({"saved": saved})


class SavedFreelancersView(generics.ListAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.saved_freelancers.filter(
            profile_complete=True
        ).prefetch_related("skills")


class FreelancerNoteView(APIView):
    """Set or clear the client's private note about a freelancer."""
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, username):
        freelancer = get_object_or_404(User, username=username)
        note = (request.data.get("note") or "").strip()
        if note:
            FreelancerNote.objects.update_or_create(
                user=request.user,
                freelancer=freelancer,
                defaults={"note": note},
            )
        else:
            FreelancerNote.objects.filter(
                user=request.user, freelancer=freelancer
            ).delete()
        return Response({"note": note})


# =============================================================================
# SKILLS
# =============================================================================

class SkillListView(generics.ListAPIView):
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        key = "api:skills"
        data = cache.get(key)
        if data is None:
            data = SkillSerializer(
                Skill.objects.filter(is_active=True), many=True
            ).data
            cache.set(key, data, 300)
        return Response(data)


class SkillAdminCreateView(generics.CreateAPIView):
    """Create a new skill. Admin only."""
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        cache.delete("api:skills")
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class SkillDeleteView(APIView):
    """Delete a skill. Admin only."""
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        skill = get_object_or_404(Skill, pk=pk)
        skill.delete()
        cache.delete("api:skills")
        return Response(status=status.HTTP_204_NO_CONTENT)


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

        department = self.request.query_params.get("department", "")
        if department:
            qs = qs.filter(department__icontains=department)

        min_rating = self.request.query_params.get("min_rating", "")
        if min_rating:
            try:
                qs = qs.filter(avg_rating_val__gte=float(min_rating))
            except (TypeError, ValueError):
                pass

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

        def cached_count(key, qs, ttl=120):
            value = cache.get(key)
            if value is None:
                value = qs.count()
                cache.set(key, value, ttl)
            return value

        ctx = {"request": request}
        data = {
            "featured": UserPublicSerializer(featured, many=True, context=ctx).data,
            "top_rated": UserPublicSerializer(top_rated, many=True, context=ctx).data,
            "recent": UserPublicSerializer(recent, many=True, context=ctx).data,
            "total_freelancers": cached_count(
                "api:home:total_freelancers",
                User.objects.filter(profile_complete=True),
            ),
            "verified_freelancers": cached_count(
                "api:home:verified_freelancers",
                User.objects.filter(profile_complete=True, verified=True),
            ),
            "total_skills": cached_count(
                "api:home:total_skills",
                Skill.objects.filter(is_active=True),
            ),
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

        location = self.request.query_params.get("location", "")
        if location:
            qs = qs.filter(location_preference__icontains=location)

        sort = self.request.query_params.get("sort", "recent")
        if sort == "applications":
            qs = qs.order_by("-_application_count", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        return qs.distinct()


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

        job = get_object_or_404(Job, pk=self.kwargs["pk"])
        if job.posted_by_id != request.user.id:
            notify(
                job.posted_by,
                f"{request.user.display_name} applied to your job '{job.title}'.",
                notification_type="application",
                link=f"/jobs/{job.pk}",
            )

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

        notify(
            application.student,
            f"Your application for '{application.job.title}' was {app_status}.",
            notification_type="application",
            link=f"/jobs/{application.job.pk}",
        )

        return Response({"detail": f"Application {app_status}."})


class JobApplicationsView(generics.ListAPIView):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        job = get_object_or_404(Job, pk=self.kwargs["pk"])
        if job.posted_by != self.request.user and not self.request.user.is_staff:
            return Application.objects.none()
        return Application.objects.filter(job=job).select_related("student")


class JobInviteView(APIView):
    """Job owner invites a freelancer to apply (creates an 'invited' application)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, user_id):
        job = get_object_or_404(Job, pk=pk)
        if job.posted_by != request.user and not request.user.is_staff:
            return Response(
                {"error": "You are not authorized to invite to this job."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if job.status != "open":
            return Response(
                {"error": "You can only invite applicants to an open job."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        candidate = get_object_or_404(User, pk=user_id)
        if not candidate.is_student:
            return Response(
                {"error": "You can only invite students to apply."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Application.objects.filter(student=candidate, job=job).exists():
            return Response(
                {"error": "This student has already applied to or been invited for this job."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        application = Application.objects.create(
            student=candidate,
            job=job,
            status="invited",
            message=f"Invited by {request.user.display_name}.",
        )
        notify(
            candidate,
            f"{request.user.display_name} invited you to apply for '{job.title}'.",
            notification_type="application",
            link=f"/jobs/{job.pk}",
        )
        return Response(
            ApplicationSerializer(application, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class InvitationRespondView(APIView):
    """Freelancer accepts or declines a job invitation."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, app_id):
        application = get_object_or_404(
            Application.objects.select_related("job"), pk=app_id
        )
        if application.student != request.user:
            return Response(
                {"error": "This invitation was not addressed to you."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if application.status != "invited":
            return Response(
                {"error": "This invitation has already been responded to."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        accepted = bool(request.data.get("accepted"))
        application.status = "pending" if accepted else "rejected"
        message = (request.data.get("message") or "").strip()
        if accepted and message:
            application.message = message
        proposed_budget = request.data.get("proposed_budget")
        if accepted and proposed_budget:
            application.proposed_budget = proposed_budget
        application.save(
            update_fields=["status", "message", "proposed_budget", "updated_at"]
        )
        notify(
            application.job.posted_by,
            f"{request.user.display_name} "
            f"{'accepted' if accepted else 'declined'} your invitation for '{application.job.title}'.",
            notification_type="application",
            link=f"/jobs/{application.job.pk}",
        )
        return Response(
            ApplicationSerializer(application, context={"request": request}).data
        )


class JobRepostView(APIView):
    """Copy a job into a fresh 'open' listing (e.g. rehire for repeat work)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        job = get_object_or_404(Job, pk=pk)
        if job.posted_by != request.user and not request.user.is_staff:
            return Response(
                {"error": "You are not authorized to repost this job."},
                status=status.HTTP_403_FORBIDDEN,
            )
        new_job = Job(
            title=job.title,
            description=job.description,
            budget_type=job.budget_type,
            budget_min=job.budget_min,
            budget_max=job.budget_max,
            budget_display=job.budget_display,
            posted_by=job.posted_by,
            status="open",
            location_preference=job.location_preference,
            contact_email=job.contact_email,
            contact_whatsapp=job.contact_whatsapp,
            is_active=True,
        )
        new_job.save()
        new_job.required_skills.set(job.required_skills.all())
        return Response(
            JobSerializer(
                new_job,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class JobArchiveStaleView(APIView):
    """Admin action: hide open jobs that have been dormant for 90+ days."""
    permission_classes = [permissions.IsAdminUser]
    STALE_DAYS = 90

    def post(self, request):
        cutoff = timezone.now() - timezone.timedelta(days=self.STALE_DAYS)
        stale = Job.objects.filter(
            is_active=True, status="open", updated_at__lt=cutoff
        )
        count = stale.count()
        for job in stale:
            job.is_active = False
            job.save(update_fields=["is_active", "updated_at"])
            notify(
                job.posted_by,
                f"Your job '{job.title}' was archived after {self.STALE_DAYS} days without activity.",
                notification_type="system",
                link=f"/jobs/{job.pk}",
            )
        return Response({"archived": count})


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

        freelancer = get_object_or_404(
            User,
            username=self.kwargs["username"],
            profile_complete=True,
        )
        if freelancer.id != request.user.id:
            notify(
                freelancer,
                f"{request.user.display_name} left you a new review.",
                notification_type="review",
                link=f"/u/{freelancer.username}",
            )

        return Response(
            {"detail": "Review submitted successfully!"},
            status=status.HTTP_201_CREATED,
        )


class ReplyReviewView(APIView):
    """The freelancer who received the review can reply to it once (editable)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        review = get_object_or_404(Review, pk=pk)
        if review.freelancer != request.user:
            return Response(
                {"error": "Only the freelancer this review is about can reply."},
                status=status.HTTP_403_FORBIDDEN,
            )
        reply = (request.data.get("reply") or "").strip()
        if not reply:
            return Response(
                {"error": "Reply cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        review.reply = reply
        review.save(update_fields=["reply", "updated_at"])
        notify(
            review.reviewer,
            f"{request.user.display_name} replied to your review.",
            notification_type="review",
            link=f"/u/{request.user.username}",
        )
        return Response(
            ReviewSerializer(review, context={"request": request}).data
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


# =============================================================================
# NOTIFICATIONS
# =============================================================================

class NotificationListView(generics.ListAPIView):
    """Paginated in-app notifications for the logged-in user."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class UnreadNotificationCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            user=request.user, is_read=False
        ).count()
        return Response({"count": count})


class MarkNotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        updated = Notification.objects.filter(
            pk=pk, user=request.user
        ).update(is_read=True)
        if not updated:
            return Response(
                {"error": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"detail": "Marked as read."})


class MarkAllNotificationsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response({"updated": updated})


# =============================================================================
# ADMIN OVERVIEW
# =============================================================================

class AdminStatsView(APIView):
    """Aggregate platform stats for the admin overview page."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        now = timezone.now()
        week_ago = now - timezone.timedelta(days=7)

        avg_rating = Review.objects.aggregate(avg_rating=Avg("rating"))["avg_rating"] or 0

        job_status_counts = dict(
            Job.objects.values_list("status").annotate(count=Count("id"))
        )

        def daily_counts(model, created_field="created_at", days=30):
            start = (now - timezone.timedelta(days=days - 1)).date()
            rows = (
                model.objects.filter(**{f"{created_field}__date__gte": start})
                .annotate(day=TruncDate(created_field))
                .values("day")
                .annotate(count=Count("id"))
            )
            counts = {row["day"]: row["count"] for row in rows}
            return [
                {
                    "date": (start + timezone.timedelta(days=i)).isoformat(),
                    "count": counts.get(start + timezone.timedelta(days=i), 0),
                }
                for i in range(days)
            ]

        return Response({
            "total_users": User.objects.count(),
            "students": User.objects.filter(
                account_type__in=["student", "both"]
            ).count(),
            "clients": User.objects.filter(account_type="client").count(),
            "recent_signups_7d": User.objects.filter(
                date_joined__gte=week_ago
            ).count(),
            "verified_students": User.objects.filter(verified=True).count(),
            "pending_verifications": User.objects.filter(
                verification_requested=True, verified=False
            ).count(),
            "skills_count": Skill.objects.filter(is_active=True).count(),
            "open_jobs": Job.objects.filter(
                is_active=True, status__in=["open", "in_progress"]
            ).count(),
            "jobs_by_status": {
                label: job_status_counts.get(value, 0)
                for value, label in Job.STATUS_CHOICES
            },
            "total_applications": Application.objects.count(),
            "pending_applications": Application.objects.filter(
                status="pending"
            ).count(),
            "total_reviews": Review.objects.count(),
            "avg_rating": round(avg_rating, 2),
            "signups_last_30d": daily_counts(User, created_field="date_joined"),
            "applications_last_30d": daily_counts(Application),
        })


class AdminUserListView(generics.ListAPIView):
    """Recent users + search, for admin moderation. Staff only."""
    serializer_class = AdminVerificationSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        qs = User.objects.all()
        search = self.request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(full_name__icontains=search) |
                Q(email__icontains=search)
            )
        return qs.order_by("-date_joined")[:50]


class AdminUserActionView(APIView):
    """Suspend or reactivate a user account. Staff only."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        action = request.data.get("action")
        if action not in ["suspend", "unsuspend"]:
            return Response(
                {"error": "Invalid action. Use 'suspend' or 'unsuspend'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = get_object_or_404(User, pk=pk)
        if user == request.user:
            return Response(
                {"error": "You cannot suspend your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_suspended = action == "suspend"
        user.save(update_fields=["is_suspended", "updated_at"])
        notify(
            user,
            (
                "Your account was suspended by an admin."
                if user.is_suspended
                else "Your account was reactivated by an admin."
            ),
            notification_type="system",
            link="/dashboard",
        )
        return Response(
            AdminVerificationSerializer(user, context={"request": request}).data
        )


class AdminJobListView(generics.ListAPIView):
    """All jobs (including hidden) for admin moderation. Staff only."""
    serializer_class = JobSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Job.objects.select_related("posted_by").prefetch_related(
            "required_skills"
        ).annotate(_application_count=Count("applications")).order_by("-created_at")


class JobModerationToggleView(APIView):
    """Approve/unhide or hide a job. Staff only."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        job = get_object_or_404(Job, pk=pk)
        job.is_active = not job.is_active
        job.save(update_fields=["is_active", "updated_at"])
        notify(
            job.posted_by,
            (
                f"Your job '{job.title}' is now hidden from the job board."
                if not job.is_active
                else f"Your job '{job.title}' is live on the job board again."
            ),
            notification_type="system",
            link=f"/jobs/{job.pk}",
        )
        return Response(JobSerializer(job, context={"request": request}).data)


# =============================================================================
# CHAT
# =============================================================================

def _user_conversations(user):
    return Conversation.objects.filter(
        Q(user_a=user) | Q(user_b=user)
    )


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return _user_conversations(self.request.user).order_by("-updated_at")


class StartConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "message"

    def post(self, request, username):
        other = get_object_or_404(User, username=username)
        if other == request.user:
            return Response(
                {"error": "You cannot message yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conversation, created = Conversation.get_or_create_for_pair(
            request.user, other
        )
        return Response(
            ConversationSerializer(
                conversation, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class UnreadConversationCountView(APIView):
    """Total unread incoming messages across all conversations (for the badge)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Message.objects.filter(
            conversation__in=_user_conversations(request.user),
            is_read=False,
        ).exclude(sender=request.user).count()
        return Response({"count": count})


class ConversationPresenceView(APIView):
    """Report which users are currently online (websocket connected)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids") or []
        if not isinstance(ids, list):
            ids = [ids]
        ids = [int(i) for i in ids if isinstance(i, int) or str(i).isdigit()][:50]
        presence = {
            str(i): bool(cache.get(f"presence:{i}"))
            for i in ids
        }
        return Response({"presence": presence})


class ConversationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "message"

    PAGE_SIZE = 30

    def get_conversation(self, request, pk):
        return get_object_or_404(_user_conversations(request.user), pk=pk)

    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)

        # Mark unread incoming messages as read only on the initial (latest)
        # page load, and broadcast the receipts so the sender sees "Read".
        before = request.query_params.get("before")
        if not before:
            unread_ids = list(
                conversation.messages.filter(is_read=False)
                .exclude(sender=request.user)
                .values_list("id", flat=True)
            )
            if unread_ids:
                conversation.messages.filter(id__in=unread_ids).update(
                    is_read=True
                )
                self._broadcast_read(conversation, unread_ids)

        qs = conversation.messages.all()
        if before:
            qs = qs.filter(id__lt=before)
        qs = qs.order_by("-id")
        page = list(qs[: self.PAGE_SIZE])
        has_more = qs.count() > self.PAGE_SIZE
        next_before = page[-1].id if has_more else None
        page.reverse()

        return Response({
            "id": conversation.id,
            "other": UserPublicSerializer(
                conversation.other(request.user), context={"request": request}
            ).data,
            "messages": MessageSerializer(page, many=True).data,
            "has_more": has_more,
            "next_before": next_before,
        })

    def _broadcast_read(self, conversation, message_ids):
        channel_layer = self._get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation.pk}",
                {"type": "chat.read", "message_ids": message_ids},
            )

    def post(self, request, pk):
        conversation = self.get_conversation(request, pk)
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response(
                {"error": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            body=body,
        )
        Conversation.objects.filter(pk=conversation.pk).update(
            updated_at=timezone.now()
        )
        recipient = conversation.other(request.user)
        notify(
            recipient,
            f"New message from {request.user.display_name}.",
            notification_type="message",
            link=f"/messages/{conversation.pk}",
        )

        # Push the message to anyone live on the websocket channel.
        channel_layer = self._get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation.pk}",
                {"type": "chat.message", "message": MessageSerializer(message).data},
            )

        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def _get_channel_layer():
        from channels.layers import get_channel_layer
        return get_channel_layer()


# =============================================================================
# MODERATION
# =============================================================================

class CreateReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "report"

    def post(self, request):
        serializer = ReportCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Report submitted. Our team will review it."},
            status=status.HTTP_201_CREATED,
        )


class MyReportsView(generics.ListAPIView):
    """Reports filed by the current user with their review status."""
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Report.objects.filter(
            reporter=self.request.user
        ).select_related("target_user", "target_job").order_by("-created_at")


class ReportListView(generics.ListAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        status_filter = self.request.query_params.get(
            "status", "pending"
        )
        return Report.objects.filter(status=status_filter).select_related(
            "reporter", "target_user", "target_job"
        )


class ReportActionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        action = request.data.get("action")
        if action not in ["resolve", "dismiss"]:
            return Response(
                {"error": "Invalid action. Use 'resolve' or 'dismiss'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = get_object_or_404(Report, pk=pk)
        report.status = "resolved" if action == "resolve" else "dismissed"
        report.resolved_by = request.user

        if action == "resolve":
            target = report.target()
            if report.target_type == "job" and target:
                target.is_active = False
                target.save(update_fields=["is_active"])
            elif report.target_type == "profile" and target and target.id != request.user.id:
                target.is_active = False
                target.save(update_fields=["is_active"])

        report.save(update_fields=["status", "resolved_by", "updated_at"])

        if report.reporter:
            notify(
                report.reporter,
                (
                    "Your report was reviewed and action was taken."
                    if action == "resolve"
                    else "Your report was reviewed and no action was taken."
                ),
                notification_type="system",
                link="/dashboard",
            )

        return Response(
            ReportSerializer(report, context={"request": request}).data
        )