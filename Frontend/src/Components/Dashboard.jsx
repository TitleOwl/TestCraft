import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CSS/Dashboard.css'; // ตรวจสอบว่า Path ถูกต้อง

// Import components
import RequirementPage from './RequirementPage';
import ProjectConfig from './ProjectConfig';
import LinkGit from './LinkGit';
import DesignPage from './DesignPage';
import TestcasePage from './Testcase/TestcasePage';
import OverviewProject from './Project/OverviewProject';
import ImplementPage from './Implement/implementPage';
import TraceabilityPage from './Traceability/traceabilityPage';

// Import icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faCog,
  faClipboardList,
  faPencilRuler,
  faCode,
  faFlask,
  faClipboardCheck,
  faCubes,
  faProjectDiagram,
  faBookOpen,
  faDoorClosed,
  faChevronLeft,
  faChevronRight,
  faLink
} from '@fortawesome/free-solid-svg-icons';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState(localStorage.getItem('selectedSection') || 'Overview');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectStatus, setProjectStatus] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

  // ดึง project_id จาก query params ใน URL
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get('project_id');

  useEffect(() => {
    if (location.state && location.state.selectedSection) {
      setSelectedSection(location.state.selectedSection);
    }
  }, [location.state]);

  // ใช้ useEffect เพื่อดึงข้อมูลโปรเจค
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      axios
        .get(`http://localhost:3001/project/${projectId}`)
        .then((res) => {
          setProjectName(res.data.project_name);
          setProjectStatus(res.data.project_status);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching project name:", err);
          setError("Failed to load project name. Please try again.");
          setLoading(false);
        });
    } else {
      setError("Project ID not found in URL.");
      setLoading(false);
    }
  }, [projectId]);

  // เก็บการเลือก section ใน localStorage
  useEffect(() => {
    localStorage.setItem('selectedSection', selectedSection);
  }, [selectedSection]);

  // เก็บสถานะ sidebar ใน localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  }, [sidebarCollapsed]);


  // ปุ่มสลับการแสดงผล sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <nav className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* ปุ่มย่อ/ขยาย Sidebar */}
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <FontAwesomeIcon icon={sidebarCollapsed ? faChevronRight : faChevronLeft} />
        </button>

        {/* Project Name */}
        {projectName && (
          <div className="dashboard-sidebar-project-name">
             {/* แสดงตัวย่อเมื่อ collapsed */}
            {sidebarCollapsed && <span className="project-initial">{projectName.charAt(0)}</span>}
             {/* แสดงชื่อเต็มเมื่อไม่ collapsed */}
            {!sidebarCollapsed && <span>{projectName}</span>}
          </div>
        )}

        {/* Project Section */}
        <div className="dashboard-sidebar-section-title">
          {!sidebarCollapsed && "PROJECT"}
        </div>

        {/* ---- Overview Link (มีการเพิ่ม overview-always-active) ---- */}
        <div
          className={`dashboard-nav-link overview-always-active ${selectedSection === 'Overview' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Overview')}
        >
          <FontAwesomeIcon icon={faHome} />
          {!sidebarCollapsed && <span>Overview</span>}
        </div>
        {/* --------------------------------------------------------- */}

        <div
          className={`dashboard-nav-link ${selectedSection === 'Configuration' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Configuration')}
        >
          <FontAwesomeIcon icon={faCog} />
          {!sidebarCollapsed && <span>  Ver. Criteria Setting</span>}
        </div>

        <div
          className={`dashboard-nav-link ${selectedSection === 'LinkGit' ? 'active' : ''}`}
          onClick={() => setSelectedSection('LinkGit')}
        >
          <FontAwesomeIcon icon={faLink} />
          {!sidebarCollapsed && <span>Github Link</span>}
        </div>

        {/* Management Section */}
        <div className="dashboard-sidebar-section-title">
          {!sidebarCollapsed && "WORK PRODUCT"}
        </div>

        <div
          className={`dashboard-nav-link ${selectedSection === 'Requirement' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Requirement')}
        >
          <FontAwesomeIcon icon={faClipboardList} />
          {!sidebarCollapsed && (
            <span style={{ whiteSpace: 'nowrap' }}>Requirement Specification</span>
          )}
        </div>

        <div
          className={`dashboard-nav-link ${selectedSection === 'Design' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Design')}
        >
          <FontAwesomeIcon icon={faPencilRuler} />
          {!sidebarCollapsed && <span>Software Design</span>}
        </div>

        <div
          className={`dashboard-nav-link ${selectedSection === 'Implementation' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Implementation')}
        >
          <FontAwesomeIcon icon={faCode} />
          {!sidebarCollapsed && <span>Code Component</span>}
        </div>

        <div
          className={`dashboard-nav-link ${selectedSection === 'Testcase' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Testcase')}
        >
          <FontAwesomeIcon icon={faFlask} />
          {!sidebarCollapsed && <span>Test case</span>}
        </div>

        <div
          className={`dashboard-nav-link ${selectedSection === 'Traceability' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Traceability')}
        >
          <FontAwesomeIcon icon={faProjectDiagram} />
          {!sidebarCollapsed && <span>Traceability</span>}
        </div>

        {/* Optional: Close Project Button */}
        {/* <button className="dashboard-close-project-btn" onClick={() => navigate('/')}>
          <FontAwesomeIcon icon={faDoorClosed} />
          {!sidebarCollapsed && <span>Close Project</span>}
        </button> */}

      </nav>

      {/* Main Content Section */}
      <div className="dashboard-content-container">
        {loading ? (
          <h2>Loading project details...</h2>
        ) : error ? (
          <h2>{error}</h2>
        ) : (
          <>
            {selectedSection === 'Overview' && <OverviewProject />}
            {selectedSection === 'Configuration' && <ProjectConfig />}
            {selectedSection === 'LinkGit' && <LinkGit />}
            {selectedSection === 'Requirement' && <RequirementPage />}
            {selectedSection === 'Design' && <DesignPage />}
            {selectedSection === 'Implementation' && <ImplementPage />}
            {selectedSection === 'Testcase' && <TestcasePage />}
            {selectedSection === 'Traceability' && <TraceabilityPage />}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;