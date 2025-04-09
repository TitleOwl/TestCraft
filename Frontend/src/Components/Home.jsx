import React from 'react';
import { Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import './CSS/Home.css';
import logo from '../image/tracecraft-logo.png';
import { toast } from 'react-toastify';  // เพิ่มการนำเข้า toast

const Home = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');  // ตรวจสอบว่า user login หรือยัง

  const handleTryNowClick = () => {
    if (!username) {
      toast.error('Please sign up or log in to try TestCraft!');  // แจ้งเตือน
    } else {
      navigate('/Project');  // ถ้าล็อกอินแล้วให้ไปที่หน้า Project
    }
  };

  return (
    <div className="home">
      <div className="home__promo-banner">
        <img src={logo} alt="TestCraft Logo" className="home__promo-image" />
        <div className="home__promo-content">
          <h2>Welcome to TestCraft</h2>
          <p>Your all-in-one project management and testing tool, ISO/IEC 29110 compliant.</p>
          <p>
            Streamline project, requirement, design, and test case management
            with seamless traceability and collaboration.
          </p>
          <p>
            Experience the future of project management and testing today!
            Start your free trial now and elevate your workflow with TestCraft.
          </p>
        </div>
        <div className="home__try-now">
          <Button onClick={handleTryNowClick} className="home__button-try">Try Now</Button>
        </div>
      </div>
    </div>
  );

}

export default Home;
