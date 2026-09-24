"""
API tests for the SkillPlug REST API.
Run with: python manage.py test apps.api
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Skill
from apps.jobs.models import Job, Application
from apps.marketplace.models import PortfolioItem
from apps.reviews.models import Review

User = get_user_model()


def make_user(username="alice", email="alice@example.com", account_type="student", **kwargs):
    """Create a user with a known password."""
    password = kwargs.pop("password", "testpass123")
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        account_type=account_type,
        full_name=kwargs.pop("full_name", username.title()),
        **kwargs,
    )
    user.raw_password = password
    return user


class HealthCheckTests(APITestCase):
    def test_health_returns_200(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")


class AuthTests(APITestCase):
    url = "/api/v1/auth/register/"

    def test_register_creates_user_and_returns_tokens(self):
        payload = {
            "username": "newstudent",
            "email": "new@example.com",
            "full_name": "New Student",
            "account_type": "student",
            "password": "str0ng-pass",
            "password2": "str0ng-pass",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data["tokens"])
        self.assertTrue(User.objects.filter(username="newstudent").exists())

    def test_register_rejects_duplicate_email(self):
        make_user(email="dup@example.com")
        payload = {
            "username": "other",
            "email": "dup@example.com",
            "full_name": "Other",
            "account_type": "student",
            "password": "str0ng-pass",
            "password2": "str0ng-pass",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_mismatched_passwords(self):
        payload = {
            "username": "badpass",
            "email": "bad@example.com",
            "full_name": "Bad",
            "account_type": "student",
            "password": "password-one",
            "password2": "password-two",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        user = make_user(email="login@example.com")
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": user.raw_password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_rejects_wrong_password(self):
        user = make_user(email="wrong@example.com")
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(APITestCase):
    url = "/api/v1/auth/profile/"

    def test_profile_requires_auth(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_get_returns_user(self):
        user = make_user()
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], user.username)

    def test_profile_patch_updates_bio(self):
        user = make_user()
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.url, {"bio": "Hello world"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.bio, "Hello world")

    def test_profile_patch_sets_profile_complete_for_student(self):
        user = make_user()
        self.client.force_authenticate(user=user)
        response = self.client.patch(
            self.url,
            {
                "school": "unilag",
                "department": "Computer Science",
                "bio": "A bio",
                "whatsapp": "2348012345678",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.profile_complete)


class JobTests(APITestCase):
    def setUp(self):
        self.student = make_user(username="stu", email="stu@example.com")
        self.client_ = make_user(username="cli", email="cli@example.com", account_type="client")
        self.skill = Skill.objects.create(name="Testing")
        self.job = Job.objects.create(
            title="Build a website",
            description="Need a portfolio site",
            posted_by=self.client_,
            budget_type="fixed",
            budget_min=5000,
            budget_max=10000,
            status="open",
        )
        self.job.required_skills.add(self.skill)

    def test_job_list_public(self):
        response = self.client.get("/api/v1/jobs/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_job_create_requires_auth(self):
        response = self.client.post(
            "/api/v1/jobs/create/",
            {"title": "No auth", "description": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_job_create_by_client(self):
        self.client.force_authenticate(user=self.client_)
        response = self.client.post(
            "/api/v1/jobs/create/",
            {
                "title": "Logo design",
                "description": "Minimal logo",
                "budget_type": "fixed",
                "budget_min": 2000,
                "budget_max": 5000,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Job.objects.filter(title="Logo design", posted_by=self.client_).exists())

    def test_job_owner_can_edit(self):
        self.client.force_authenticate(user=self.client_)
        response = self.client.patch(
            f"/api/v1/jobs/{self.job.id}/",
            {"status": "closed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, "closed")

    def test_job_non_owner_cannot_edit(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            f"/api/v1/jobs/{self.job.id}/",
            {"title": "Hijacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_apply(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/v1/jobs/{self.job.id}/apply/",
            {"message": "I can build this", "proposed_budget": 7000},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Application.objects.filter(student=self.student, job=self.job).exists()
        )

    def test_student_cannot_apply_twice(self):
        Application.objects.create(student=self.student, job=self.job, message="first")
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/v1/jobs/{self.job.id}/apply/",
            {"message": "second attempt"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_cannot_apply_to_own_job(self):
        self.client.force_authenticate(user=self.client_)
        response = self.client.post(
            f"/api/v1/jobs/{self.job.id}/apply/",
            {"message": "my own job"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_application_status_update_owner_only(self):
        application = Application.objects.create(
            student=self.student, job=self.job, message="hi"
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            f"/api/v1/jobs/{application.id}/status/accepted/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        application.refresh_from_db()
        self.assertEqual(application.status, "pending")

    def test_application_status_accept_by_owner(self):
        application = Application.objects.create(
            student=self.student, job=self.job, message="hi"
        )
        self.client.force_authenticate(user=self.client_)
        response = self.client.post(
            f"/api/v1/jobs/{application.id}/status/accepted/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, "accepted")


class ReviewTests(APITestCase):
    def setUp(self):
        self.freelancer = make_user(username="freelancer", email="freelancer@example.com")
        self.freelancer.profile_complete = True
        self.freelancer.save(update_fields=["profile_complete"])

        self.client_ = make_user(username="reviewer", email="reviewer@example.com", account_type="client")

    def test_review_create(self):
        self.client.force_authenticate(user=self.client_)
        response = self.client.post(
            f"/api/v1/reviews/{self.freelancer.username}/create/",
            {"rating": 5, "comment": "Great work!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Review.objects.filter(reviewer=self.client_, freelancer=self.freelancer).exists()
        )

    def test_review_requires_auth(self):
        response = self.client.post(
            f"/api/v1/reviews/{self.freelancer.username}/create/",
            {"rating": 4, "comment": "ok"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_review_cannot_self_review(self):
        self.client.force_authenticate(user=self.freelancer)
        response = self.client.post(
            f"/api/v1/reviews/{self.freelancer.username}/create/",
            {"rating": 5, "comment": "self"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_cannot_be_duplicated(self):
        Review.objects.create(
            reviewer=self.client_, freelancer=self.freelancer, rating=5
        )
        self.client.force_authenticate(user=self.client_)
        response = self.client.post(
            f"/api/v1/reviews/{self.freelancer.username}/create/",
            {"rating": 4, "comment": "again"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reviews_list_public(self):
        Review.objects.create(
            reviewer=self.client_, freelancer=self.freelancer, rating=4, comment="nice"
        )
        response = self.client.get(f"/api/v1/reviews/{self.freelancer.username}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


class PortfolioTests(APITestCase):
    def setUp(self):
        self.student = make_user(username="port", email="port@example.com")

    def test_portfolio_requires_auth(self):
        response = self.client.post(
            "/api/v1/portfolio/",
            {"title": "Project", "description": "x"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_portfolio_permission_owner_only(self):
        item = PortfolioItem.objects.create(
            user=self.student, title="Mine", image=""
        )
        other = make_user(username="other", email="other@example.com")
        self.client.force_authenticate(user=other)
        response = self.client.patch(
            f"/api/v1/portfolio/{item.id}/",
            {"title": "Not mine"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SaveFreelancerTests(APITestCase):
    def test_toggle_save_requires_auth(self):
        freelancer = make_user(username="saveme", email="saveme@example.com", profile_complete=True)
        response = self.client.post(f"/api/v1/users/{freelancer.username}/save/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_toggle_save_roundtrip(self):
        freelancer = make_user(username="saveme2", email="saveme2@example.com")
        freelancer.profile_complete = True
        freelancer.save(update_fields=["profile_complete"])

        client_ = make_user(username="saver", email="saver@example.com", account_type="client")
        self.client.force_authenticate(user=client_)

        response = self.client.post(f"/api/v1/users/{freelancer.username}/save/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["saved"])

        response = self.client.post(f"/api/v1/users/{freelancer.username}/save/")
        self.assertFalse(response.data["saved"])