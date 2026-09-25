"""
Forms for the accounts app.
Handles user registration, profile creation and updates.
"""

from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm, PasswordResetForm, SetPasswordForm
from django.core.validators import RegexValidator
from .models import User, Skill


INPUT_CLASSES = (
    "w-full px-4 py-3 rounded-lg border border-gray-300 "
    "text-black bg-white "
    "focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
)


class CustomLoginForm(AuthenticationForm):
    """Login form with explicit widget classes so input text stays black in both light and dark mode."""

    username = forms.CharField(
        widget=forms.TextInput(attrs={
            "class": INPUT_CLASSES,
            "placeholder": "Enter your email or username",
            "autofocus": True,
        }),
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": INPUT_CLASSES,
            "placeholder": "Enter your password",
        }),
    )


class CustomSignupForm(UserCreationForm):
    """Enhanced signup form with student-specific fields."""
    
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-black-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "your.email@school.edu.ng",
        }),
    )
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Choose a username",
        }),
    )
    full_name = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Your full name",
        }),
    )
    account_type = forms.ChoiceField(
        choices=User.ACCOUNT_TYPE_CHOICES,
        initial="student",
        widget=forms.Select(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    school = forms.ChoiceField(
        choices=[("", "--- Select Your School ---")] + User.NIGERIAN_UNIVERSITIES,
        required=False,
        widget=forms.Select(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    whatsapp = forms.CharField(
        max_length=20,
        required=False,
        validators=[RegexValidator(r"^\d{10,15}$", "Enter a valid phone number (digits only, with country code)")],
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "2348012345678",
        }),
    )
    password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Create a strong password",
        }),
    )
    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Confirm your password",
        }),
    )
    
    class Meta:
        model = User
        fields = ["username", "email", "full_name", "account_type", "school", "whatsapp", "password1", "password2"]
    
    def clean_whatsapp(self):
        whatsapp = self.cleaned_data.get("whatsapp", "")
        if whatsapp and not whatsapp.startswith("234"):
            whatsapp = "234" + whatsapp.lstrip("0")
        return whatsapp
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        user.full_name = self.cleaned_data["full_name"]
        user.account_type = self.cleaned_data["account_type"]
        user.school = self.cleaned_data["school"]
        user.whatsapp = self.cleaned_data["whatsapp"]
        if commit:
            user.save()
        return user


class ProfileCreateForm(forms.ModelForm):
    """Form for creating a complete student profile after signup."""
    
    full_name = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Your full name",
        }),
    )
    bio = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none",
            "placeholder": "Tell clients about yourself, your skills and experience...",
            "rows": 4,
        }),
    )
    school = forms.ChoiceField(
        choices=[("", "--- Select Your School ---")] + User.NIGERIAN_UNIVERSITIES,
        widget=forms.Select(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    department = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "e.g., Computer Science",
        }),
    )
    whatsapp = forms.CharField(
        max_length=20,
        validators=[RegexValidator(r"^\d{10,15}$", "Enter a valid phone number")],
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "2348012345678",
        }),
    )
    skills = forms.ModelMultipleChoiceField(
        queryset=Skill.objects.filter(is_active=True),
        required=False,
        widget=forms.CheckboxSelectMultiple(attrs={
            "class": "form-checkbox h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500",
        }),
    )
    profile_image = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "accept": "image/*",
        }),
    )
    availability_status = forms.ChoiceField(
        choices=User.AVAILABILITY_CHOICES,
        initial="available",
        widget=forms.Select(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    verification_doc = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "accept": "image/*",
        }),
    )
    
    class Meta:
        model = User
        fields = [
            "full_name", "bio", "school", "department",
            "whatsapp", "skills", "profile_image",
            "availability_status", "verification_doc",
        ]
    
    def clean_whatsapp(self):
        whatsapp = self.cleaned_data.get("whatsapp", "")
        if whatsapp and not whatsapp.startswith("234"):
            whatsapp = "234" + whatsapp.lstrip("0")
        return whatsapp
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.profile_complete = True
        if commit:
            user.save()
            self.save_m2m()
        return user


class ProfileUpdateForm(forms.ModelForm):
    """Form for updating an existing profile."""
    
    full_name = forms.CharField(
        max_length=200,
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    bio = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none",
            "rows": 4,
        }),
    )
    school = forms.ChoiceField(
        choices=[("", "--- Select Your School ---")] + User.NIGERIAN_UNIVERSITIES,
        widget=forms.Select(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    department = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    whatsapp = forms.CharField(
        max_length=20,
        validators=[RegexValidator(r"^\d{10,15}$", "Enter a valid phone number")],
        widget=forms.TextInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    skills = forms.ModelMultipleChoiceField(
        queryset=Skill.objects.filter(is_active=True),
        required=False,
        widget=forms.CheckboxSelectMultiple(attrs={
            "class": "form-checkbox h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500",
        }),
    )
    profile_image = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "accept": "image/*",
        }),
    )
    availability_status = forms.ChoiceField(
        choices=User.AVAILABILITY_CHOICES,
        widget=forms.Select(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
        }),
    )
    verification_doc = forms.ImageField(
        required=False,
        widget=forms.FileInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "accept": "image/*",
        }),
    )
    
    class Meta:
        model = User
        fields = [
            "full_name", "bio", "school", "department",
            "whatsapp", "skills", "profile_image", "availability_status",
            "verification_doc",
        ]
    
    def clean_whatsapp(self):
        whatsapp = self.cleaned_data.get("whatsapp", "")
        if whatsapp and not whatsapp.startswith("234"):
            whatsapp = "234" + whatsapp.lstrip("0")
        return whatsapp


class CustomPasswordResetForm(PasswordResetForm):
    """Custom password reset form with styled widgets."""
    
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Enter your email address",
        }),
    )


class CustomSetPasswordForm(SetPasswordForm):
    """Custom password reset confirmation form."""
    
    new_password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Enter new password",
        }),
    )
    new_password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            "class": "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all",
            "placeholder": "Confirm new password",
        }),
    )