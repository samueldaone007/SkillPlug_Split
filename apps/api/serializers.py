"""
Serializers for the SkillPlug REST API.
Convert models to/from JSON for the React frontend.
"""

from django.db.models import Avg, Count
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import Skill
from apps.jobs.models import Job, Application
from apps.marketplace.models import PortfolioItem
from apps.reviews.models import Review

User = get_user_model()


# =============================================================================
# SKILL
# =============================================================================

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name", "description", "icon"]


# =============================================================================
# AUTHENTICATION
# =============================================================================

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "full_name", "account_type", "password", "password2"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# =============================================================================
# USER
# =============================================================================

class UserPublicSerializer(serializers.ModelSerializer):
    """Public-facing freelancer data."""
    skills = SkillSerializer(many=True, read_only=True)
    whatsapp_link = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    school_display = serializers.CharField(read_only=True)
    is_student = serializers.BooleanField(read_only=True)
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    portfolio_count = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "full_name", "display_name", "account_type",
            "school", "school_display", "department", "bio", "whatsapp", "whatsapp_link",
            "skills", "profile_image", "availability_status", "verified",
            "date_joined", "avg_rating", "review_count", "portfolio_count",
            "is_student", "is_saved",
        ]

    def get_avg_rating(self, obj):
        reviews = obj.reviews_received.all()
        if not reviews:
            return 0
        return round(sum(r.rating for r in reviews) / len(reviews), 1)

    def get_review_count(self, obj):
        return obj.reviews_received.count()

    def get_portfolio_count(self, obj):
        return obj.portfolio_items.count()

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return request.user.saved_freelancers.filter(id=obj.id).exists()
        return False


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile for the authenticated user."""
    skills = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.filter(is_active=True), required=False
    )
    skills_detail = SkillSerializer(source="skills", many=True, read_only=True)
    saved_freelancers = UserPublicSerializer(many=True, read_only=True)
    is_student = serializers.BooleanField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    whatsapp_link = serializers.CharField(read_only=True)
    school_display = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "full_name", "display_name", "account_type",
            "school", "school_display", "department", "bio", "whatsapp", "whatsapp_link",
            "skills", "skills_detail", "profile_image", "verification_doc",
            "availability_status", "verified", "verification_date",
            "profile_complete", "date_joined", "updated_at",
            "saved_freelancers", "dark_mode", "is_student",
        ]
        read_only_fields = ["username", "email", "verified", "verification_date",
                            "profile_complete", "date_joined", "updated_at",
                            "saved_freelancers", "is_student"]

    def validate_skills(self, value):
        for skill in value:
            if not skill.is_active:
                raise serializers.ValidationError(f"Skill '{skill.name}' is not available.")
        return value

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        required_fields = ["school", "department", "bio", "whatsapp"]
        if instance.account_type in ["student", "both"]:
            instance.profile_complete = all(
                getattr(instance, field) for field in required_fields
            )
        else:
            instance.profile_complete = bool(instance.full_name or instance.bio)
        instance.save(update_fields=["profile_complete"])
        return instance


class DashboardSerializer(serializers.Serializer):
    """Aggregated data for the user dashboard."""
    portfolio_count = serializers.SerializerMethodField()
    saved_count = serializers.SerializerMethodField()
    total_jobs_posted = serializers.SerializerMethodField()
    total_applications = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    my_applications = serializers.SerializerMethodField()
    my_jobs = serializers.SerializerMethodField()
    portfolio_items = serializers.SerializerMethodField()
    my_reviews = serializers.SerializerMethodField()
    recommended = serializers.SerializerMethodField()

    def get_portfolio_count(self, obj):
        return obj.portfolio_items.count()

    def get_saved_count(self, obj):
        return obj.saved_freelancers.count()

    def get_total_jobs_posted(self, obj):
        return obj.jobs_posted.count()

    def get_total_applications(self, obj):
        return obj.applications.count()

    def get_avg_rating(self, obj):
        reviews = obj.reviews_received.all()
        if not reviews:
            return 0
        return round(sum(r.rating for r in reviews) / len(reviews), 1)

    def get_review_count(self, obj):
        return obj.reviews_received.count()

    def get_my_applications(self, obj):
        qs = obj.applications.select_related("job").all()[:5]
        return ApplicationSerializer(qs, many=True, context=self.context).data

    def get_my_jobs(self, obj):
        qs = obj.jobs_posted.annotate(
            _application_count=Count("applications")
        ).all()[:5]
        return JobSerializer(qs, many=True, context=self.context).data

    def get_portfolio_items(self, obj):
        qs = obj.portfolio_items.all()[:6]
        return PortfolioItemSerializer(qs, many=True, context=self.context).data

    def get_my_reviews(self, obj):
        qs = obj.reviews_received.select_related("reviewer").all()[:5]
        return ReviewSerializer(qs, many=True, context=self.context).data

    def get_recommended(self, obj):
        if obj.skills.exists():
            qs = User.objects.filter(
                skills__in=obj.skills.all(),
                availability_status="available",
                profile_complete=True,
            ).exclude(id=obj.id).distinct()[:4]
        else:
            qs = User.objects.filter(
                availability_status="available",
                profile_complete=True,
            ).exclude(id=obj.id)[:4]
        return UserPublicSerializer(qs, many=True, context=self.context).data


# =============================================================================
# JOB & APPLICATION
# =============================================================================

class JobSerializer(serializers.ModelSerializer):
    posted_by = UserPublicSerializer(read_only=True)
    required_skills = SkillSerializer(many=True, read_only=True)
    application_count = serializers.SerializerMethodField()
    budget_string = serializers.CharField(read_only=True)
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id", "title", "description", "budget_type", "budget_min", "budget_max",
            "budget_display", "budget_string", "posted_by", "required_skills",
            "status", "location_preference", "contact_email", "contact_whatsapp",
            "created_at", "updated_at", "is_active", "application_count", "has_applied",
        ]
        read_only_fields = ["posted_by", "created_at", "updated_at"]

    def get_application_count(self, obj):
        annotated = getattr(obj, "_application_count", None)
        if annotated is not None:
            return annotated
        return obj.application_count

    def get_has_applied(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Application.objects.filter(student=request.user, job=obj).exists()
        return False


class JobCreateSerializer(serializers.ModelSerializer):
    required_skills = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Skill.objects.filter(is_active=True), required=False
    )

    class Meta:
        model = Job
        fields = [
            "title", "description", "budget_type", "budget_min", "budget_max",
            "budget_display", "required_skills", "status", "location_preference",
            "contact_email", "contact_whatsapp",
        ]

    def validate(self, attrs):
        if attrs.get("budget_min") and attrs.get("budget_max"):
            if attrs["budget_min"] > attrs["budget_max"]:
                raise serializers.ValidationError(
                    {"budget_min": "Minimum budget cannot exceed maximum budget."}
                )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["posted_by"] = request.user
        return super().create(validated_data)


class ApplicationSerializer(serializers.ModelSerializer):
    student = UserPublicSerializer(read_only=True)
    job = JobSerializer(read_only=True)

    class Meta:
        model = Application
        fields = [
            "id", "student", "job", "message", "proposed_budget",
            "status", "created_at", "updated_at",
        ]
        read_only_fields = ["student", "status", "created_at", "updated_at"]


class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ["message", "proposed_budget"]

    def validate(self, attrs):
        request = self.context.get("request")
        job = self.context.get("job")

        if not request.user.is_student:
            raise serializers.ValidationError("Only students can apply for jobs.")

        if job.posted_by == request.user:
            raise serializers.ValidationError("You cannot apply to your own job.")

        if Application.objects.filter(student=request.user, job=job).exists():
            raise serializers.ValidationError("You have already applied for this job.")

        if job.status != "open":
            raise serializers.ValidationError("This job is no longer open for applications.")

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        job = self.context.get("job")
        validated_data["student"] = request.user
        validated_data["job"] = job
        return super().create(validated_data)


# =============================================================================
# PORTFOLIO
# =============================================================================

class PortfolioItemSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)

    class Meta:
        model = PortfolioItem
        fields = [
            "id", "user", "title", "description", "image",
            "project_url", "created_at", "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["user"] = request.user
        return super().create(validated_data)


# =============================================================================
# REVIEW
# =============================================================================

class ReviewSerializer(serializers.ModelSerializer):
    reviewer = UserPublicSerializer(read_only=True)
    reviewer_name = serializers.CharField(source="reviewer.display_name", read_only=True)
    rating_stars = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id", "reviewer", "reviewer_name", "freelancer",
            "rating", "comment", "rating_stars", "created_at", "updated_at",
        ]
        read_only_fields = ["reviewer", "freelancer", "created_at", "updated_at"]

    def get_rating_stars(self, obj):
        return {"filled": list(range(obj.rating)), "empty": list(range(5 - obj.rating))}


class ReviewCreateSerializer(serializers.ModelSerializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)

    class Meta:
        model = Review
        fields = ["rating", "comment"]

    def validate(self, attrs):
        request = self.context.get("request")
        freelancer = self.context.get("freelancer")

        if not request.user.is_authenticated:
            raise serializers.ValidationError("You must be logged in to leave a review.")

        if freelancer == request.user:
            raise serializers.ValidationError("You cannot review yourself.")

        if Review.objects.filter(reviewer=request.user, freelancer=freelancer).exists():
            raise serializers.ValidationError("You have already reviewed this freelancer.")

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        freelancer = self.context.get("freelancer")
        validated_data["reviewer"] = request.user
        validated_data["freelancer"] = freelancer
        return super().create(validated_data)


# =============================================================================
# HOME / MARKETPLACE
# =============================================================================

class HomeSerializer(serializers.Serializer):
    featured = UserPublicSerializer(many=True)
    top_rated = UserPublicSerializer(many=True)
    recent = UserPublicSerializer(many=True)
    total_freelancers = serializers.IntegerField()
    verified_freelancers = serializers.IntegerField()
    total_skills = serializers.IntegerField()
    skills = SkillSerializer(many=True)
    universities = serializers.ListField(child=serializers.ListField())