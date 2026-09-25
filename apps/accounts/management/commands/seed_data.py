"""
Management command to seed the database with sample data.
Usage: python manage.py seed_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import Skill
from apps.marketplace.models import PortfolioItem
from apps.jobs.models import Job, Application
from apps.reviews.models import Review

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with sample data for development"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding database...")
        
        self.create_skills()
        self.create_users()
        self.create_portfolio_items()
        self.create_jobs()
        self.create_applications()
        self.create_reviews()
        
        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
    
    def create_skills(self):
        """Create common skills."""
        skills = [
            "Graphics Design",
            "Logo Design",
            "Web Development",
            "Mobile App Development",
            "UI/UX Design",
            "Content Writing",
            "Copywriting",
            "Social Media Management",
            "Video Editing",
            "Photography",
            "Data Entry",
            "Virtual Assistance",
            "Digital Marketing",
            "SEO",
            "WordPress",
            "Python",
            "JavaScript",
            "React",
            "Django",
            "Flutter",
            "Translation",
            "Transcription",
            "Proofreading",
            "Illustration",
            "3D Modeling",
        ]
        
        for skill_name in skills:
            Skill.objects.get_or_create(name=skill_name, defaults={"is_active": True})
        
        self.stdout.write(f"  Created {len(skills)} skills")
    
    def create_users(self):
        """Create sample users."""
        users_data = [
            {
                "username": "ademola_dev",
                "email": "ademola@unilag.edu.ng",
                "full_name": "Ademola Ogunlesi",
                "school": "unilag",
                "department": "Computer Science",
                "bio": "Full-stack developer with 3 years of experience building web applications. I specialize in Django and React. Currently in my final year at UNILAG.",
                "whatsapp": "2348012345678",
                "account_type": "student",
                "availability_status": "available",
                "verified": True,
                "profile_complete": True,
                "skills": ["Web Development", "Django", "React", "Python", "JavaScript"],
            },
            {
                "username": "chioma_designs",
                "email": "chioma@oau.edu.ng",
                "full_name": "Chioma Nwosu",
                "school": "oau",
                "department": "Fine Arts",
                "bio": "Creative graphic designer specializing in brand identity and logo design. I help startups and small businesses stand out with unique visual designs.",
                "whatsapp": "2348023456789",
                "account_type": "student",
                "availability_status": "available",
                "verified": True,
                "profile_complete": True,
                "skills": ["Graphics Design", "Logo Design", "UI/UX Design", "Illustration"],
            },
            {
                "username": "tunde_writes",
                "email": "tunde@ui.edu.ng",
                "full_name": "Tunde Bakare",
                "school": "ui",
                "department": "English Literature",
                "bio": "Professional content writer and copywriter. I create engaging blog posts, website copy, and marketing content that drives conversions.",
                "whatsapp": "2348034567890",
                "account_type": "student",
                "availability_status": "available",
                "verified": True,
                "profile_complete": True,
                "skills": ["Content Writing", "Copywriting", "Proofreading", "SEO"],
            },
            {
                "username": "fatima_apps",
                "email": "fatima@abu.edu.ng",
                "full_name": "Fatima Ibrahim",
                "school": "abu",
                "department": "Computer Engineering",
                "bio": "Mobile app developer specializing in Flutter. I build cross-platform apps for iOS and Android. Passionate about creating intuitive user experiences.",
                "whatsapp": "2348045678901",
                "account_type": "student",
                "availability_status": "busy",
                "verified": True,
                "profile_complete": True,
                "skills": ["Mobile App Development", "Flutter", "UI/UX Design", "JavaScript"],
            },
            {
                "username": "emmanuel_video",
                "email": "emmanuel@uniben.edu.ng",
                "full_name": "Emmanuel Eze",
                "school": "uniben",
                "department": "Mass Communication",
                "bio": "Video editor and motion graphics designer. I create compelling video content for social media, YouTube, and corporate presentations.",
                "whatsapp": "2348056789012",
                "account_type": "student",
                "availability_status": "available",
                "verified": False,
                "verification_requested": True,
                "profile_complete": True,
                "skills": ["Video Editing", "Photography", "Social Media Management"],
            },
            {
                "username": "sarah_client",
                "email": "sarah@gmail.com",
                "full_name": "Sarah Johnson",
                "school": "",
                "department": "",
                "bio": "Small business owner looking for talented student freelancers to help with various projects.",
                "whatsapp": "2348067890123",
                "account_type": "client",
                "availability_status": "available",
                "verified": False,
                "profile_complete": True,
                "skills": [],
            },
        ]
        
        for user_data in users_data:
            skills_names = user_data.pop("skills", [])
            username = user_data["username"]
            
            user, created = User.objects.get_or_create(
                username=username,
                defaults=user_data,
            )
            
            if created:
                user.set_password("password123")
                user.save()
                
                # Add skills
                for skill_name in skills_names:
                    try:
                        skill = Skill.objects.get(name=skill_name)
                        user.skills.add(skill)
                    except Skill.DoesNotExist:
                        pass
            
        self.stdout.write(f"  Created {len(users_data)} users")
    
    def create_portfolio_items(self):
        """Create sample portfolio items."""
        portfolio_data = [
            {
                "username": "ademola_dev",
                "title": "E-Commerce Website",
                "description": "A full-stack e-commerce platform built with Django and React. Features include user authentication, product catalog, shopping cart, and payment integration.",
            },
            {
                "username": "ademola_dev",
                "title": "School Management System",
                "description": "A comprehensive school management system for tracking students, grades, and attendance. Built with Django and Bootstrap.",
            },
            {
                "username": "chioma_designs",
                "title": "TechStart Brand Identity",
                "description": "Complete brand identity design for a tech startup including logo, business cards, letterhead, and brand guidelines.",
            },
            {
                "username": "chioma_designs",
                "title": "Restaurant Menu Design",
                "description": "Elegant menu design for an upscale restaurant featuring custom illustrations and typography.",
            },
            {
                "username": "fatima_apps",
                "title": "Fitness Tracker App",
                "description": "A cross-platform fitness tracking app built with Flutter. Features workout tracking, progress analytics, and social sharing.",
            },
            {
                "username": "emmanuel_video",
                "title": "Corporate Promo Video",
                "description": "A 2-minute promotional video for a fintech company, featuring motion graphics and professional editing.",
            },
        ]
        
        for item_data in portfolio_data:
            username = item_data.pop("username")
            try:
                user = User.objects.get(username=username)
                PortfolioItem.objects.get_or_create(
                    user=user,
                    title=item_data["title"],
                    defaults=item_data,
                )
            except User.DoesNotExist:
                pass
        
        self.stdout.write(f"  Created {len(portfolio_data)} portfolio items")
    
    def create_jobs(self):
        """Create sample job postings."""
        jobs_data = [
            {
                "username": "sarah_client",
                "title": "Logo Design for New Bakery",
                "description": "I need a creative and modern logo for my new bakery business called 'Sweet Cravings'. The logo should be warm, inviting, and memorable. I'm looking for something with earthy tones and maybe an illustration of baked goods.\n\nDeliverables:\n- Main logo design\n- Social media profile versions\n- Business card layout\n\nBudget is negotiable based on portfolio quality.",
                "budget_type": "fixed",
                "budget_min": 5000,
                "budget_max": 15000,
                "location_preference": "Remote",
                "required_skills": ["Graphics Design", "Logo Design", "Illustration"],
            },
            {
                "username": "sarah_client",
                "title": "WordPress Website for Real Estate Agency",
                "description": "Looking for a web developer to build a professional WordPress website for a real estate agency. The site needs property listings, agent profiles, and contact forms.\n\nRequirements:\n- Responsive design\n- Property listing functionality\n- Contact forms\n- SEO optimization\n- Fast loading speed",
                "budget_type": "fixed",
                "budget_min": 30000,
                "budget_max": 50000,
                "location_preference": "Remote",
                "required_skills": ["Web Development", "WordPress", "SEO"],
            },
            {
                "username": "sarah_client",
                "title": "Social Media Content Creation",
                "description": "Need a social media manager to create content for Instagram and Twitter for a fashion brand. Looking for 15 posts per week with captions and hashtags.\n\nResponsibilities:\n- Create engaging visuals\n- Write compelling captions\n- Research trending hashtags\n- Schedule posts\n- Monthly performance report",
                "budget_type": "hourly",
                "budget_display": "₦2,000 - ₦3,000 per hour",
                "location_preference": "Lagos",
                "required_skills": ["Social Media Management", "Graphics Design", "Content Writing"],
            },
            {
                "username": "sarah_client",
                "title": "Mobile App UI/UX Design",
                "description": "Seeking a talented UI/UX designer to create the interface for a food delivery app. Need wireframes, high-fidelity mockups, and a design system.\n\nDeliverables:\n- User flow diagrams\n- Wireframes\n- High-fidelity mockups\n- Design system/components\n- Prototype",
                "budget_type": "negotiable",
                "budget_display": "Negotiable",
                "location_preference": "Remote",
                "required_skills": ["UI/UX Design", "Mobile App Development"],
            },
        ]
        
        for job_data in jobs_data:
            skills_names = job_data.pop("required_skills", [])
            username = job_data.pop("username")
            
            try:
                posted_by = User.objects.get(username=username)
                job, created = Job.objects.get_or_create(
                    posted_by=posted_by,
                    title=job_data["title"],
                    defaults=job_data,
                )
                
                if created:
                    for skill_name in skills_names:
                        try:
                            skill = Skill.objects.get(name=skill_name)
                            job.required_skills.add(skill)
                        except Skill.DoesNotExist:
                            pass
            except User.DoesNotExist:
                pass
        
        self.stdout.write(f"  Created {len(jobs_data)} jobs")
    
    def create_applications(self):
        """Create sample job applications."""
        applications_data = [
            {
                "student_username": "chioma_designs",
                "job_title": "Logo Design for New Bakery",
                "message": "Hi! I'm a graphic design student at OAU with extensive experience in logo design. I've created brand identities for several small businesses and would love to work on your bakery logo. I can deliver the main logo, social media versions, and business card layout within 5 days. My portfolio includes similar food industry work. Looking forward to hearing from you!",
                "proposed_budget": 10000,
            },
            {
                "student_username": "ademola_dev",
                "job_title": "WordPress Website for Real Estate Agency",
                "message": "Hello! I'm a final year Computer Science student at UNILAG specializing in web development. I've built several WordPress sites including one for a property management company. I can deliver a responsive, SEO-optimized website with all the features you need within 2 weeks. I'm also experienced with real estate plugins and can set up property listings easily.",
                "proposed_budget": 40000,
            },
            {
                "student_username": "fatima_apps",
                "job_title": "Mobile App UI/UX Design",
                "message": "Hi Sarah! I'm a Computer Engineering student at ABU with strong UI/UX design skills. I've designed interfaces for 3 mobile apps during my internship. I can create user flows, wireframes, high-fidelity mockups, and an interactive prototype using Figma. I understand food delivery apps well and can create an intuitive user experience.",
            },
        ]
        
        for app_data in applications_data:
            student_username = app_data.pop("student_username")
            job_title = app_data.pop("job_title")
            
            try:
                student = User.objects.get(username=student_username)
                job = Job.objects.get(title=job_title)
                Application.objects.get_or_create(
                    student=student,
                    job=job,
                    defaults=app_data,
                )
            except (User.DoesNotExist, Job.DoesNotExist):
                pass
        
        self.stdout.write(f"  Created {len(applications_data)} applications")
    
    def create_reviews(self):
        """Create sample reviews."""
        reviews_data = [
            {
                "reviewer_username": "sarah_client",
                "freelancer_username": "chioma_designs",
                "rating": 5,
                "comment": "Chioma exceeded my expectations! She created a beautiful logo for my business and was very professional throughout the process. Highly recommend!",
            },
            {
                "reviewer_username": "sarah_client",
                "freelancer_username": "ademola_dev",
                "rating": 5,
                "comment": "Ademola built an amazing website for my business. He was responsive, delivered on time, and the quality of work was outstanding. Will definitely hire again!",
            },
            {
                "reviewer_username": "sarah_client",
                "freelancer_username": "tunde_writes",
                "rating": 4,
                "comment": "Tunde wrote excellent content for my blog. His writing is engaging and well-researched. Minor revisions were needed but he handled them promptly.",
            },
        ]
        
        for review_data in reviews_data:
            reviewer_username = review_data.pop("reviewer_username")
            freelancer_username = review_data.pop("freelancer_username")
            
            try:
                reviewer = User.objects.get(username=reviewer_username)
                freelancer = User.objects.get(username=freelancer_username)
                Review.objects.get_or_create(
                    reviewer=reviewer,
                    freelancer=freelancer,
                    defaults=review_data,
                )
            except (User.DoesNotExist, User.DoesNotExist):
                pass
        
        self.stdout.write(f"  Created {len(reviews_data)} reviews")
