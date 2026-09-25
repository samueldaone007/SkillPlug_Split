"""
Seed the Skill model with the services Nigerian students actually sell
on campus — beauty, fashion, food, errands and tutoring, with only a
little tech.

Idempotent: safe to run any number of times (existing skills are skipped).

Run: python manage.py seed_skills
"""

from django.core.management.base import BaseCommand
from apps.accounts.models import Skill

SKILLS = [
    "Hairdressing & Styling",
    "Barbing",
    "Nail Tech",
    "Manicure & Pedicure",
    "Makeup Artist",
    "Lash Tech",
    "Skincare/Facials",
    "Wig Making/Wig Vendor",
    "Tailoring",
    "Waist Beads Making",
    "Shoe Repair/Cobbling",
    "Small Chops Party Snacks",
    "Home-cooked Meal Delivery",
    "Cake Baking & Decoration",
    "Laundry & Ironing Services",
    "Errand Running/Dispatch",
    "Data Browsing & Airtime Top-up",
    "Event Photography",
]


class Command(BaseCommand):
    help = "Seed the database with the core Nigerian campus skills"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing skills before seeding (clears skills from profiles/jobs too).",
        )

    def handle(self, *args, **kwargs):
        if kwargs.get("reset"):
            count = Skill.objects.count()
            Skill.objects.all().delete()
            self.stdout.write(f"Cleared {count} existing skills.")

        created = 0
        for name in SKILLS:
            _, was_created = Skill.objects.get_or_create(
                name=name,
                defaults={"icon": "", "is_active": True},
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Done! {created} new skills added ({Skill.objects.count()} total).")
        )