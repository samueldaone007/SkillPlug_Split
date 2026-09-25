"""
API tests for the SkillPlug REST API.
Run with: python manage.py test apps.api
"""

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from io import BytesIO
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Skill
from apps.chat.models import Conversation, Message
from apps.jobs.models import Job, Application
from apps.marketplace.models import PortfolioItem
from apps.moderation.models import Report
from apps.notifications.models import Notification, notify
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


def make_image(name="id.png"):
    """Create a tiny valid PNG for ImageField uploads."""
    buffer = BytesIO()
    Image.new("RGB", (10, 10), color="red").save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


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

    def test_register_rejects_weak_password(self):
        payload = {
            "username": "weakpass",
            "email": "weak@example.com",
            "full_name": "Weak",
            "account_type": "student",
            "password": "short",
            "password2": "short",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_register_rejects_all_lowercase_password(self):
        payload = {
            "username": "noup",
            "email": "noup@example.com",
            "full_name": "No Up",
            "account_type": "student",
            "password": "alllowercase1",
            "password2": "alllowercase1",
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)


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


class VerificationRequestTests(APITestCase):
    url = "/api/v1/auth/profile/"

    def test_request_verification_sets_flag(self):
        user = make_user()
        self.client.force_authenticate(user=user)
        response = self.client.patch(
            self.url,
            {"verification_requested": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.verification_requested)
        self.assertFalse(user.verified)
        self.assertEqual(response.data["verification_status"], "pending")

    def test_cannot_self_verify(self):
        user = make_user()
        self.client.force_authenticate(user=user)
        response = self.client.patch(
            self.url,
            {"verification_requested": True, "verified": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertFalse(user.verified)
        self.assertTrue(user.verification_requested)

    def test_doc_upload_auto_queues_verification(self):
        user = make_user()
        self.client.force_authenticate(user=user)
        response = self.client.patch(
            self.url,
            {"verification_doc": make_image()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.verification_requested)
        self.assertFalse(user.verified)
        self.assertTrue(user.verification_doc)

    def test_doc_reupload_resubmits_request(self):
        user = make_user(verified=True)
        user.verification_requested = False
        user.verification_date = None
        user.save(update_fields=["verified", "verification_requested", "verification_date"])

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            self.url,
            {"verification_doc": make_image()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertFalse(user.verified)
        self.assertTrue(user.verification_requested)

    def test_status_is_none_by_default(self):
        user = make_user()
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.data["verification_status"], "none")

    def test_verified_status(self):
        user = make_user(verified=True)
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.data["verification_status"], "verified")


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


class AdminVerificationTests(APITestCase):
    def setUp(self):
        self.admin = make_user(
            username="admin", email="admin@skillplug.com", is_staff=True
        )
        self.student = make_user(
            username="pending_stu", email="pending@example.com"
        )
        self.student.verification_requested = True
        self.student.save(update_fields=["verification_requested"])

    def test_queue_requires_staff(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/v1/admin/verifications/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_queue_lists_pending_only(self):
        already_verified = make_user(
            username="verified_stu", email="verified@example.com", verified=True
        )
        already_verified.verification_requested = True
        already_verified.save(update_fields=["verification_requested"])

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/verifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [item["username"] for item in response.data]
        self.assertIn("pending_stu", usernames)
        self.assertNotIn("verified_stu", usernames)

    def test_verify_action(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/verifications/{self.student.id}/",
            {"action": "verify"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertTrue(self.student.verified)
        self.assertFalse(self.student.verification_requested)
        self.assertIsNotNone(self.student.verification_date)
        self.assertEqual(response.data["verification_status"], "verified")

    def test_reject_action(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/verifications/{self.student.id}/",
            {"action": "reject", "reason": "ID image is blurry"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertFalse(self.student.verified)
        self.assertFalse(self.student.verification_requested)
        self.assertIsNone(self.student.verification_date)
        self.assertEqual(self.student.verification_reject_reason, "ID image is blurry")
        self.assertEqual(response.data["verification_status"], "none")

    def test_verify_clears_previous_reject_reason(self):
        self.student.verification_reject_reason = "Blurry ID"
        self.student.save(update_fields=["verification_reject_reason"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/verifications/{self.student.id}/",
            {"action": "verify"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertIsNone(self.student.verification_reject_reason)

    def test_student_notified_of_decision(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(
            f"/api/v1/admin/verifications/{self.student.id}/",
            {"action": "verify"},
            format="json",
        )
        notification = Notification.objects.filter(user=self.student).first()
        self.assertIsNotNone(notification)
        self.assertIn("verified", notification.message.lower())

    def test_reject_without_reason_stores_none(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/verifications/{self.student.id}/",
            {"action": "reject"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student.refresh_from_db()
        self.assertIsNone(self.student.verification_reject_reason)

    def test_staff_only_enforced(self):
        other = make_user(username="other_stu", email="other_stu@example.com")
        self.client.force_authenticate(user=other)
        response = self.client.post(
            f"/api/v1/admin/verifications/{self.student.id}/",
            {"action": "verify"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_action_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/verifications/{self.student.id}/",
            {"action": "maybe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class NotificationTests(APITestCase):
    def setUp(self):
        self.user = make_user(username="notif", email="notif@example.com")
        self.other = make_user(username="notif_other", email="notif_other@example.com")

    def test_notifications_require_auth(self):
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_returns_only_own_notifications(self):
        Notification.objects.create(user=self.user, message="mine")
        Notification.objects.create(user=self.other, message="theirs")

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["message"], "mine")
        self.assertIn("id", results[0])
        self.assertIn("is_read", results[0])

    def test_list_is_paginated(self):
        for i in range(14):
            Notification.objects.create(user=self.user, message=f"n{i}")

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 14)
        self.assertEqual(len(response.data["results"]), 12)
        self.assertIsNotNone(response.data["next"])

        response = self.client.get("/api/v1/notifications/", {"page": 2})
        self.assertEqual(len(response.data["results"]), 2)
        self.assertIsNone(response.data["next"])

    def test_unread_count_lists_read_separately(self):
        Notification.objects.create(user=self.user, message="new", is_read=False)
        Notification.objects.create(user=self.user, message="old", is_read=True)

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/notifications/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_mark_all_read(self):
        Notification.objects.create(user=self.user, message="a", is_read=False)
        Notification.objects.create(user=self.user, message="b", is_read=False)

        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/v1/notifications/read-all/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Notification.objects.filter(user=self.user, is_read=False).count(), 0
        )

    def test_mark_one_read(self):
        notification = Notification.objects.create(user=self.user, message="single")

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f"/api/v1/notifications/{notification.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_cannot_mark_other_users_notification(self):
        notification = Notification.objects.create(user=self.other, message="theirs")

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f"/api/v1/notifications/{notification.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        notification.refresh_from_db()
        self.assertFalse(notification.is_read)


class AdminStatsTests(APITestCase):
    def setUp(self):
        self.admin = make_user(
            username="stats_admin", email="stats_admin@skillplug.com", is_staff=True
        )
        self.student = make_user(username="stats_stu", email="stats_stu@example.com")

    def test_stats_require_staff(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/v1/admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_return_aggregates(self):
        self.student.verification_requested = True
        self.student.save(update_fields=["verification_requested"])

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_users"], 2)
        self.assertEqual(response.data["students"], 1)
        self.assertEqual(response.data["pending_verifications"], 1)
        self.assertEqual(response.data["verified_students"], 0)
        self.assertIn("jobs_by_status", response.data)
        self.assertIn("recent_signups_7d", response.data)


class NotificationPrefsTests(APITestCase):
    url = "/api/v1/auth/profile/"

    def setUp(self):
        self.user = make_user(username="prefs", email="prefs@example.com")

    def test_sound_toggle_persists(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url, {"notification_sound_enabled": False}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.notification_sound_enabled)

    def test_preferences_persist(self):
        self.client.force_authenticate(user=self.user)
        prefs = {"review": False, "message": False}
        response = self.client.patch(
            self.url, {"notification_preferences": prefs}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.notification_preferences["review"], False)

    def test_notify_respects_opt_out(self):
        self.user.notification_preferences = {"review": False}
        self.user.save(update_fields=["notification_preferences"])

        notify(self.user, "Review alert", notification_type="review", link="/u/x")
        self.assertFalse(
            Notification.objects.filter(user=self.user, notification_type="review").exists()
        )

        self.user.notification_preferences = {}
        self.user.save(update_fields=["notification_preferences"])
        notify(self.user, "Review alert", notification_type="review", link="/u/x")
        self.assertTrue(
            Notification.objects.filter(user=self.user, notification_type="review").exists()
        )


class ChatTests(APITestCase):
    def setUp(self):
        self.alice = make_user(username="alicechat", email="alice_chat@example.com")
        self.bob = make_user(username="bobchat", email="bob_chat@example.com")

    def test_start_conversation_creates_once(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post("/api/v1/conversations/start/bobchat/")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)

        response = self.client.post("/api/v1/conversations/start/bobchat/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_conversation_pair_is_unique_ordered(self):
        conversation = Conversation.get_or_create_for_pair(self.alice, self.bob)
        self.assertEqual(conversation.user_a_id, self.alice.id)
        self.assertEqual(conversation.user_b_id, self.bob.id)

        second = Conversation.get_or_create_for_pair(self.bob, self.alice)
        self.assertEqual(second.id, conversation.id)

    def test_cannot_message_self(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post("/api/v1/conversations/start/alicechat/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_conversation_start_requires_auth(self):
        response = self.client.post("/api/v1/conversations/start/bobchat/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_send_message_notifies_and_marks_read(self):
        conversation = Conversation.get_or_create_for_pair(self.alice, self.bob)

        self.client.force_authenticate(user=self.alice)
        response = self.client.post(
            f"/api/v1/conversations/{conversation.pk}/",
            {"body": "Hello Bob"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["body"], "Hello Bob")
        self.assertEqual(response.data["sender"], self.alice.id)

        self.assertTrue(
            Notification.objects.filter(
                user=self.bob, notification_type="message"
            ).exists()
        )

        self.client.force_authenticate(user=self.bob)
        response = self.client.get(f"/api/v1/conversations/{conversation.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["other"]["username"], "alicechat")
        self.assertEqual(len(response.data["messages"]), 1)
        message = Message.objects.get(pk=response.data["messages"][0]["id"])
        self.assertTrue(message.is_read)

    def test_cannot_read_others_conversation(self):
        conversation = Conversation.get_or_create_for_pair(self.alice, self.bob)
        carol = make_user(username="carolchat", email="carol_chat@example.com")
        self.client.force_authenticate(user=carol)
        response = self.client.get(f"/api/v1/conversations/{conversation.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_shows_only_participating_conversations(self):
        Conversation.get_or_create_for_pair(self.alice, self.bob)
        carol = make_user(username="carol2", email="carol2@example.com")
        Conversation.get_or_create_for_pair(self.bob, carol)

        self.client.force_authenticate(user=self.alice)
        response = self.client.get("/api/v1/conversations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["other"]["username"], "bobchat")


class ModerationTests(APITestCase):
    def setUp(self):
        self.student = make_user(username="rep_stu", email="rep_stu@example.com")
        self.reported = make_user(username="bad_freelancer", email="bad_freelancer@example.com")
        self.admin = make_user(username="mod_admin", email="mod_admin@skillplug.com", is_staff=True)
        self.client_user = make_user(
            username="rep_client", email="rep_client@example.com", account_type="client"
        )
        self.job = Job.objects.create(
            title="Suspicious job",
            description="Clearly against the rules",
            posted_by=self.client_user,
            budget_type="fixed",
            budget_min=1000,
            budget_max=5000,
            status="open",
        )

    def test_report_requires_auth(self):
        response = self.client.post(
            "/api/v1/reports/",
            {"target_type": "profile", "target_id": self.reported.id, "reason": "spam"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_report_profile(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            "/api/v1/reports/",
            {"target_type": "profile", "target_id": self.reported.id, "reason": "Fake ID"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        report = Report.objects.get()
        self.assertEqual(report.target_user, self.reported)
        self.assertEqual(report.target_type, "profile")
        self.assertEqual(report.status, "pending")

    def test_report_job(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            "/api/v1/reports/",
            {"target_type": "job", "target_id": self.job.id, "reason": "Scam offer"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Report.objects.get().target_job, self.job)

    def test_cannot_report_self(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            "/api/v1/reports/",
            {"target_type": "profile", "target_id": self.student.id, "reason": "self"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_reason_rejected(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            "/api/v1/reports/",
            {"target_type": "profile", "target_id": self.reported.id, "reason": "  "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reports_require_staff(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get("/api/v1/admin/reports/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_lists_pending(self):
        Report.objects.create(
            reporter=self.student,
            target_type="job",
            target_job=self.job,
            reason="Scam",
        )
        Report.objects.create(
            reporter=self.student,
            target_type="job",
            target_job=self.job,
            reason="Resolved",
            status="resolved",
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/admin/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["reason"], "Scam")

    def test_resolve_deactivates_job_and_notifies(self):
        report = Report.objects.create(
            reporter=self.student,
            target_type="job",
            target_job=self.job,
            reason="Scam",
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/reports/{report.id}/action/",
            {"action": "resolve"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.job.refresh_from_db()
        self.assertFalse(self.job.is_active)
        report.refresh_from_db()
        self.assertEqual(report.status, "resolved")
        self.assertTrue(
            Notification.objects.filter(user=self.student).exists()
        )

    def test_dismiss_keeps_target_active(self):
        report = Report.objects.create(
            reporter=self.student,
            target_type="job",
            target_job=self.job,
            reason="Scam",
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/reports/{report.id}/action/",
            {"action": "dismiss"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.job.refresh_from_db()
        self.assertTrue(self.job.is_active)
        report.refresh_from_db()
        self.assertEqual(report.status, "dismissed")

    def test_invalid_action_rejected(self):
        report = Report.objects.create(
            reporter=self.student,
            target_type="job",
            target_job=self.job,
            reason="Scam",
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/admin/reports/{report.id}/action/",
            {"action": "maybe"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)