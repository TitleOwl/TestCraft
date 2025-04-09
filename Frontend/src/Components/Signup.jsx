import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CSS/Login.css';
import logo from '../image/tracecraft-logo.png';
import { toast } from 'react-toastify';

const Signup = () => {
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        password: '',
        agreeToTerms: false,
    });

    const navigate = useNavigate(); // ใช้ useNavigate สำหรับเปลี่ยนเส้นทาง

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.agreeToTerms) {
            toast.warning('You must agree to the Terms & Conditions to sign up.'); // ใช้ toast แทน alert
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_name: formData.fullName,
                    user_password: formData.password,
                }),
            });

            if (response.ok) {
                toast.success('Sign up successful! Welcome to TestCraft!'); // แสดงข้อความสำเร็จ
                navigate('/'); // เปลี่ยนเส้นทางไปหน้า Login
            } else {
                const errorData = await response.json();

                // ตรวจสอบข้อผิดพลาดที่เกิดขึ้น
                if (errorData.code === 'DUPLICATE_USER') {
                    // สร้าง username แบบแนะนำ
                    const suggestedUsername = formData.fullName + '_' + Math.random().toString(36).substring(2, 6);

                    toast.error(
                        `The username "${formData.fullName}" is already in use. Please try another username like "${suggestedUsername}".`
                    );
                } else {
                    toast.error('Sign up failed: ' + errorData.message);
                }
            }
        } catch (error) {
            console.error('Error signing up:', error);
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
                    <h1 className="login-title">Sign Up</h1>
                    <p className="login-subtext">
                        Already have an account? <a href="/" className="login-link">Log In</a>
                    </p>
                    <div className="login-form-group">
                        <label htmlFor="fullName" className="login-label">User Name</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            className="login-input"
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>
                    <div className="login-form-group">
                        <label htmlFor="password" className="login-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="login-input"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    <div className="login-form-options">
                        <label className="login-checkbox-label">
                            <input
                                type="checkbox"
                                name="agreeToTerms"
                                checked={formData.agreeToTerms}
                                onChange={handleChange}
                            />
                            I agree to the Terms & Conditions
                        </label>
                    </div>
                    <button type="submit" className="login-button">
                        Sign Up
                    </button>
                </form>
            </div>
        </div>
    );

};

export default Signup;
