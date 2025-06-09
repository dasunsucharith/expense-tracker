import { state } from './state.js';
import { setCookie, getCookie, eraseCookie, showToast, updateCurrencySymbols } from './utils.js';

export function initAuth() {
    state.API_URL = window.location.origin;
    state.token = state.token || getCookie('token');
    if (state.token) {
        localStorage.setItem('token', state.token);
        fetchUserProfile();
    }
}

export function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');

    fetch(`${state.API_URL}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.token) {
                state.token = data.token;
                setCookie('token', state.token, 1);
                localStorage.setItem('token', state.token);
                state.currentUser = data.user;
                updateCurrencySymbols();
                window.location.href = '/dashboard';
            } else {
                errorElement.textContent = data.message || 'Login failed. Please check your credentials.';
                errorElement.classList.remove('d-none');
            }
        })
        .catch((error) => {
            console.error('Login error:', error);
            errorElement.textContent = 'An error occurred during login. Please try again.';
            errorElement.classList.remove('d-none');
        });
}

export function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    if (password !== confirmPassword) {
        const errorElement = document.getElementById('register-error');
        errorElement.textContent = 'Passwords do not match.';
        errorElement.classList.remove('d-none');
        return;
    }
    fetch(`${state.API_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.message === 'User registered successfully') {
                showToast('Registration successful! Please log in.', 'success');
                const loginTab = document.getElementById('login-tab');
                if (loginTab) {
                    loginTab.click();
                } else {
                    window.location.href = '/login';
                }
            } else {
                const errorElement = document.getElementById('register-error');
                errorElement.textContent = data.message || 'Registration failed. Please try again.';
                errorElement.classList.remove('d-none');
            }
        })
        .catch((error) => {
            console.error('Registration error:', error);
            const errorElement = document.getElementById('register-error');
            errorElement.textContent = 'An error occurred during registration. Please try again.';
            errorElement.classList.remove('d-none');
        });
}

export function handleLogout(e) {
    e.preventDefault();
    state.token = null;
    localStorage.removeItem('token');
    eraseCookie('token');
    state.currentUser = null;
    window.location.href = '/login';
}

export function fetchUserProfile() {
    fetch(`${state.API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${state.token}` }
    })
        .then((response) => {
            if (!response.ok) throw new Error('Token invalid');
            return response.json();
        })
        .then((data) => {
            state.currentUser = data;
            updateCurrencySymbols();
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) usernameDisplay.textContent = state.currentUser.username;
        })
        .catch((error) => {
            console.error('Profile fetch error:', error);
            state.token = null;
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
}

export function showUserProfile(e) {
    if (e) e.preventDefault();
    fetch(`${state.API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${state.token}` }
    })
        .then((response) => response.json())
        .then((data) => {
            const usernameEl = document.getElementById('profile-username');
            if (usernameEl) {
                if (usernameEl.tagName === 'INPUT') {
                    usernameEl.value = data.username;
                } else {
                    usernameEl.textContent = data.username;
                }
            }
            const emailEl = document.getElementById('profile-email');
            if (emailEl) {
                if (emailEl.tagName === 'INPUT') {
                    emailEl.value = data.email;
                } else {
                    emailEl.textContent = data.email;
                }
            }
            const createdEl = document.getElementById('profile-created');
            if (createdEl) createdEl.textContent = new Date(data.created_at).toLocaleString();
            const currencyEl = document.getElementById('profile-currency');
            if (currencyEl) currencyEl.value = data.currency || 'USD';
            const passwordEl = document.getElementById('profile-password');
            if (passwordEl && passwordEl.tagName === 'INPUT') passwordEl.value = '';
        })
        .catch(() => {
            showToast('Failed to load profile', 'error');
        });
}

export function saveUserProfile() {
    const username = document.getElementById('profile-username')?.value;
    const email = document.getElementById('profile-email')?.value;
    const password = document.getElementById('profile-password')?.value;
    const currency = document.getElementById('profile-currency').value;
    fetch(`${state.API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ username, email, password, currency })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.user) {
                state.currentUser = data.user;
                updateCurrencySymbols();
                window.location.reload();
                showToast('Profile updated', 'success');
            } else {
                showToast(data.message || 'Failed to update profile', 'error');
            }
        })
        .catch((error) => {
            console.error('Profile update error:', error);
            showToast('Failed to update profile', 'error');
        });
}
