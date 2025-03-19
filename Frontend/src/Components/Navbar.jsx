import React, { useEffect, useState, useRef } from 'react';
import './CSS/Navbar.css'; // ใช้ CSS ไฟล์ใหม่ที่เราสร้าง
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../image/testcraft-logo.png';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronDown, 
  faSignOutAlt, 
  faUser, 
  faCog, 
  faClipboardList, 
  faChartBar, 
  faBell
} from '@fortawesome/free-solid-svg-icons';

function Navbar() {
    const [username, setUsername] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState(2); // สมมติว่ามีการแจ้งเตือน 2 รายการ
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        setUsername(storedUsername);
        
        // เพิ่ม event listener เพื่อปิด dropdown เมื่อคลิกที่อื่น
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('username');
        setUsername(null);
        setIsDropdownOpen(false);
        navigate('/');
    };

    const handleLoginRedirect = () => {
        navigate('/'); // ไปที่หน้า login
    };
    
    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };
    
    // สำหรับแสดงตัวอักษรแรกของชื่อผู้ใช้เป็นอวตาร์
    const getInitials = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };
    
    // ตรวจสอบว่าลิงก์ไหนกำลังถูกเลือกอยู่
    const isActive = (path) => {
        return location.pathname.startsWith(path);
    };

    return (
        <>
            <nav className="enterprise-navbar">
                <div className="enterprise-navbar-brand">
                    <Link to="/Project">
                        <img src={logo} alt="TestCraft Logo" className="enterprise-logo" />
                    </Link>
                    
                    {/* Main Navigation */}
                    {username && (
                        <div className="enterprise-navbar-nav">
                            <Link 
                                to="/Project" 
                                className={`enterprise-nav-item ${isActive('/Project') ? 'active' : ''}`}
                            >
                                <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '8px' }} />
                                Projects
                            </Link>
                          
                        </div>
                    )}
                </div>
                
                <div className="enterprise-navbar-actions">
                    {/* แจ้งเตือน */}
                    {username && (
                        <>
                            <div className="enterprise-notification-icon">
                                <FontAwesomeIcon icon={faBell} size="lg" />
                                {notifications > 0 && (
                                    <span className="enterprise-notification-badge">{notifications}</span>
                                )}
                            </div>
                            <div className="enterprise-navbar-divider"></div>
                        </>
                    )}
                    
                    {/* User Profile */}
                    {username ? (
                        <div className="enterprise-dropdown" ref={dropdownRef}>
                            <div className="enterprise-user-profile" onClick={toggleDropdown}>
                                <div className="enterprise-user-avatar">
                                    {getInitials(username)}
                                </div>
                                <div className="enterprise-user-info">
                                    <span className="enterprise-username">{username}</span>
                                    <span className="enterprise-user-role">Admin</span>
                                </div>
                                <FontAwesomeIcon 
                                    icon={faChevronDown} 
                                    className={`enterprise-dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} 
                                    style={{ 
                                        fontSize: '12px', 
                                        marginLeft: '4px',
                                        transition: 'transform 0.2s',
                                        transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)'
                                    }}
                                />
                            </div>
                            
                            {isDropdownOpen && (
                                <div className="enterprise-dropdown-menu">
                                    <div className="enterprise-dropdown-item">
                                        <FontAwesomeIcon icon={faUser} />
                                        My Profile
                                    </div>
                                    <div className="enterprise-dropdown-item">
                                        <FontAwesomeIcon icon={faCog} />
                                        Settings
                                    </div>
                                    <div className="enterprise-dropdown-divider"></div>
                                    <div 
                                        className="enterprise-dropdown-item danger"
                                        onClick={handleLogout}
                                    >
                                        <FontAwesomeIcon icon={faSignOutAlt} />
                                        Logout
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button 
                            onClick={handleLoginRedirect} 
                            className="enterprise-login-button"
                        >
                            Login
                        </button>
                    )}
                </div>
            </nav>
            <ToastContainer />
        </>
    );
}

export default Navbar;