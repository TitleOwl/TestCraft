import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CSS/Dashboard.css';

// Import components
import RequirementPage from './RequirementPage';
import ProjectConfig from './ProjectConfig';
import DesignPage from './DesignPage';
import TestcasePage from './Testcase/TestcasePage';
import OverviewProject from './Project/OverviewProject';
import ImplementPage from './Implement/implementPage';
import TraceabilityPage from './Traceability/traceabilityPage';

// Import icons (ติดตั้งด้วย: npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons @fortawesome/fontawesome-svg-core)
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
  faChevronRight
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

      // หา project name จาก project_id
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

  const handleCloseProject = async () => {
    const confirmation = window.confirm("คุณแน่ใจที่จะปิดโปรเจค?");
    if (confirmation) {
      try {
        // ดึงข้อมูลโปรเจกต์ปัจจุบัน
        const res = await axios.get(`http://localhost:3001/project/${projectId}`);
        const currentProject = res.data;

        // สร้างข้อมูลใหม่ที่มีสถานะ CLOSE แต่ข้อมูลอื่นเหมือนเดิม
        const updatedProject = {
          ...currentProject,
          project_status: 'CLOSED',
        };

        // ส่งข้อมูลไปยัง Backend
        await axios.put(`http://localhost:3001/project/${projectId}`, updatedProject);
        alert("Project closed successfully!");

        // อัปเดตสถานะโปรเจกต์ใน UI
        setProjectStatus('CLOSED');
        navigate('/Project');
      } catch (error) {
        console.error("Error closing project:", error);
        alert("Failed to close project. Please try again.");
      }
    }
  };

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
            {!sidebarCollapsed && projectName}
            {sidebarCollapsed && <span className="project-initial">{projectName.charAt(0)}</span>}
          </div>
        )}

        {/* Project Section */}
        <div className="dashboard-sidebar-section-title">
          {!sidebarCollapsed && "PROJECT"}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Overview' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Overview')}
        >
          <FontAwesomeIcon icon={faHome} />
          {!sidebarCollapsed && <span>Overview</span>}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Configuration' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Configuration')}
        >
          <FontAwesomeIcon icon={faCog} />
          {!sidebarCollapsed && <span>Configuration</span>}
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
          {!sidebarCollapsed && <span>Requirement</span>}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Design' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Design')}
        >
          <FontAwesomeIcon icon={faPencilRuler} />
          {!sidebarCollapsed && <span>Design</span>}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Implementation' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Implementation')}
        >
          <FontAwesomeIcon icon={faCode} />
          {!sidebarCollapsed && <span>Implementation</span>}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Testcase' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Testcase')}
        >
          <FontAwesomeIcon icon={faFlask} />
          {!sidebarCollapsed && <span>Test case</span>}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Review' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Review')}
        >
          <FontAwesomeIcon icon={faClipboardCheck} />
          {!sidebarCollapsed && <span>Review</span>}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Baseline' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Baseline')}
        >
          <FontAwesomeIcon icon={faCubes} />
          {!sidebarCollapsed && <span>Baseline</span>}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Traceability' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Traceability')}
        >
          <FontAwesomeIcon icon={faProjectDiagram} />
          {!sidebarCollapsed && <span>Traceability</span>}
        </div>

        {/* Automation Section */}
        <div className="dashboard-sidebar-section-title">
          {!sidebarCollapsed && "GUIDES"}
        </div>
        
        <div
          className={`dashboard-nav-link ${selectedSection === 'Guide Tutorial' ? 'active' : ''}`}
          onClick={() => setSelectedSection('Guide Tutorial')}
        >
          <FontAwesomeIcon icon={faBookOpen} />
          {!sidebarCollapsed && <span>Guide Tutorial</span>}
        </div>

        {/* Close Project Button in Sidebar */}
        {projectStatus !== 'CLOSE' && (
          <button onClick={handleCloseProject} className="dashboard-close-project-btn">
            <FontAwesomeIcon icon={faDoorClosed} />
            {!sidebarCollapsed && <span>Close Project</span>}
          </button>
        )}
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
            {selectedSection === 'Requirement' && <RequirementPage />}
            {selectedSection === 'Design' && <DesignPage />}
            {selectedSection === 'Implementation' && <ImplementPage />}
            {selectedSection === 'Testcase' && <TestcasePage />}
            {selectedSection === 'Review' && <h2>Review Content</h2>}
            {selectedSection === 'Baseline' && <h2>Baseline Content</h2>}
            {selectedSection === 'Traceability' && <TraceabilityPage />}
            {selectedSection === 'Guide Tutorial' && <h2>Guide Tutorial Content</h2>}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;