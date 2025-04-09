import React, { useState } from 'react';
import './CSS/Login.css';
import logo from '../image/tracecraft-logo.png';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

const Login = ({ setUsername }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const navigate = useNavigate();

    const handleChange = ({ target: { name, value } }) => {
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.password) {
            toast.warning('Please fill in all required fields.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_name: formData.username,
                    user_password: formData.password,
                }),
            });

            if (response.ok) {
                toast.success(`User ${formData.username} Login Success`);
                localStorage.setItem('username', formData.username);
                navigate('/Home');
            } else {
                toast.error('Username or password is incorrect.');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again later.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <img src={logo} alt="TestCraft Logo" className="login-logo" />
            </div>
            <div className="login-right">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h1 className="login-title">Welcome to TestCraft</h1>
                    <p className="login-subtext">
                        Don't have an account yet? <a href="/Signup" className="login-link">Sign Up</a>
                    </p>
                    <div className="login-form-group">
                        <label htmlFor="username" className="login-label">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter your username"
                            required
                            className="login-input"
                        />
                    </div>
                    <div className="login-form-group">
                        <label htmlFor="password" className="login-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                            className="login-input"
                        />
                    </div>
                    <button type="submit" className="login-button">
                        Login
                    </button>
                </form>
            </div>
            <ToastContainer />
        </div>
    );
};

export default Login;
