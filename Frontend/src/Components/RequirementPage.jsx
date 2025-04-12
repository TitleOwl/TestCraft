import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPen, 
  faTrash, 
  faFileUpload, 
  faMagnifyingGlass, 
  faDownload, 
  faEye, 
  faPlus,
  faFilter,
  faClipboardList,
  faCheck,
  faHistory,
  faCodeBranch,
  faHome,
  faChevronRight,
  faListAlt,
  faSearch,
  faCheckCircle,
  faExchangeAlt,
  faTimesCircle,
  faCircle,
  faFileAlt,
  faTimes,
  faSort,
  faTable,
  faQuestionCircle
} from "@fortawesome/free-solid-svg-icons";
import { FileAddOutlined } from "@ant-design/icons";
import Modal from "react-modal";
import UploadFile from "./Uploadfile";
import "./CSS/RequirementPage.css";
import "jspdf-autotable";
import clearsearch from '../image/clearsearch.png';
import Joyride, { STATUS } from 'react-joyride';

Modal.setAppElement("#root"); // For accessibility

const RequirementPage = () => {
  const [requirementList, setRequirementList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [alertMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState("requirements");
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const [runTutorial, setRunTutorial] = useState(false); // State ควบคุมการเริ่ม Tutorial
  const [tutorialSteps, setTutorialSteps] = useState([
    // ขั้นตอนที่ 1: แนะนำให้อัปโหลดไฟล์
    {
      target: '.REQupload-button', // CSS Selector ของปุ่ม "Add File"
      content: 'เริ่มต้นด้วยการอัปโหลดไฟล์เอกสารที่เกี่ยวข้องกับโปรเจกต์ที่นี่ก่อนครับ',
      placement: 'top',      // แสดงกล่องข้อความด้านบนปุ่ม (ปรับตำแหน่งได้ตามความเหมาะสม)
      disableBeacon: true, // ปิดเอฟเฟกต์กระพริบนำทาง (ถ้าไม่ต้องการ)
    },
    // ขั้นตอนที่ 2: แนะนำให้เพิ่ม Requirement
    {
      target: '.REQadd-requirement-button', // CSS Selector ของปุ่ม "Add Requirement"
      content: 'หลังจากอัปโหลดไฟล์แล้ว ลองเพิ่ม Requirement หรือข้อกำหนดแรกของคุณที่ปุ่มนี้ได้เลย',
      placement: 'bottom', // แสดงกล่องข้อความด้านล่างปุ่ม (ปรับตำแหน่งได้)
    },
    // ขั้นตอนที่ 3: แนะนำการ View Requirement แรก
    {
      // เราจะชี้ไปที่ปุ่ม View ของ Requirement แถวแรกในตาราง
      // หมายเหตุ: ต้องแน่ใจว่ามี Requirement อย่างน้อย 1 แถวแสดงอยู่ตอน Tutorial ทำงาน
      target: '.REQreq-actions-cell .REQview-button',
      content: 'ตอนนี้คุณมี Requirement แล้ว คลิกไอคอนรูปตาสีฟ้าเพื่อดูรายละเอียด และตรวจสอบความถูกต้อง',
      placement: 'bottom', // หรือ 'left', 'right' ตามความเหมาะสม
    },
  
    // ขั้นตอนที่ 4: แนะนำการ Edit Requirement แรก
    {
      // ชี้ไปที่ปุ่ม Edit ของ Requirement แถวแรก
      target: '.REQreq-actions-cell .REQedit-button',
      content: 'หากต้องการแก้ไขข้อมูล คลิกที่ไอคอนปากกาสีส้มนี้',
      placement: 'bottom', // หรือ 'left', 'right' ตามความเหมาะสม
    },
  
    // ขั้นตอนที่ 5: แนะนำการเริ่ม Verification
    {
      // ชี้ไปที่ปุ่ม Create Verification ใน Header
      target: '.REQheader-tab-bar .REQheader-tab:nth-child(2)',
      content: 'เมื่อตรวจสอบข้อมูลจนแน่ใจแล้ว กดปุ่มนี้เพื่อเริ่มกระบวนการส่ง Requirement ให้ทีมตรวจสอบ (Verification)',
      placement: 'bottom',
    },
    {
      // ชี้ไปที่ Tab "Verification List" (แท็บที่ 3)
      target: '.REQheader-tab-bar .REQheader-tab:nth-child(3)',
      content: 'หลังจากสร้าง Verification แล้ว Requirement ที่รอตรวจสอบ (สถานะ WAITING FOR VERIFICATION) จะแสดงในหน้านี้ คลิกเพื่อเข้าไปดำเนินการ Verify',
      placement: 'bottom',
    },
    {
      // ชี้ไปที่ Tab "Create Validation" (แท็บที่ 4)
      target: '.REQheader-tab-bar .REQheader-tab:nth-child(4)',
      content: 'หากต้องการเริ่มกระบวนการ Validation (เช่น ทดสอบโดยลูกค้า) ให้คลิกที่แท็บนี้เพื่อสร้างงาน Validation',
      placement: 'bottom',
    },
    {
      // ชี้ไปที่ Tab "Validation List" (แท็บที่ 5)
      target: '.REQheader-tab-bar .REQheader-tab:nth-child(5)',
      content: 'Requirement ที่รอการทำ Validation (สถานะ WAITING FOR VALIDATION) จะแสดงอยู่ในรายการนี้',
      placement: 'bottom',
    },
    {
      // ชี้ไปที่ Tab "Baseline" (แท็บที่ 8)
      target: '.REQheader-tab-bar .REQheader-tab:nth-child(6)',
      content: 'เมื่อ Requirement ผ่านการ Verify และ Validate แล้ว สามารถกำหนด Baseline (เวอร์ชันหลัก) ได้จากส่วนนี้',
      placement: 'bottom',
    },
  ]);

  const handleRestartTutorial = () => {
    // ตั้งค่าให้ Joyride ทำงานอีกครั้ง
    setRunTutorial(true);
  };

  // Fetch data
  useEffect(() => {
    if (projectId) {
      setLoading(true);

      // Fetch project name
      axios
        .get(`http://localhost:3001/project/${projectId}`)
        .then((res) => {
          setProjectName(res.data.project_name);
        })
        .catch((err) => {
          console.error("Error fetching project name:", err);
          setError("Failed to load project name. Please try again.");
        });

    // Fetch requirements
    axios
      .get(`http://localhost:3001/project/${projectId}/requirement`)
      .then((requirementsRes) => {
        setRequirementList(requirementsRes.data);
      })
      .catch((err) => {
        console.error("Error fetching requirements:", err);
      });

    // Fetch files
    axios
      .get(`http://localhost:3001/files?project_id=${projectId}`)
      .then((filesRes) => {
        console.log('Files Data:', filesRes.data);
        setFiles(filesRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching files:", err);
        setError("Failed to load files. Please try again.");
        setLoading(false);
      });
  }
}, [projectId]);

  // Filter requirements based on search and filters
  useEffect(() => {
    let filtered = requirementList.filter((requirement) =>
      requirement.requirement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      requirement.requirement_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `REQ-${requirement.requirement_id.toString()}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((requirement) =>
        requirement.requirement_status === statusFilter
      );
    }

    // Filter by type
    if (typeFilter) {
      filtered = filtered.filter((requirement) =>
        requirement.requirement_type === typeFilter
      );
    }

    setFilteredRequirements(filtered);
  }, [searchQuery, requirementList, statusFilter, typeFilter]);

  useEffect(() => {
    // ตรวจสอบว่าเคยแสดง Tutorial หรือยัง (ตัวอย่างง่ายๆ ด้วย localStorage)
    const tutorialShown = localStorage.getItem('requirementPageTutorialShown');
    if (!tutorialShown) {
      setRunTutorial(true); // ถ้ายังไม่เคยดู ให้เริ่ม Tutorial
    }
 
    // ... โค้ด fetch ข้อมูลเดิม ...
  }, [projectId]); // ใส่ dependency array ให้ถูกต้อง


  const handleDelete = (requirementId) => {
    if (window.confirm("Are you sure you want to delete this requirement?")) {
      axios
        .delete(`http://localhost:3001/requirement/${requirementId}`)
        .then((response) => {
          console.log("Requirement deleted:", response.data);
          setRequirementList((prev) =>
            prev.filter((req) => req.requirement_id !== requirementId)
          );
        })
        .catch((err) => {
          console.log("Error deleting requirement:", err);
        });
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDeleteFile = (fileId) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      axios
        .delete(`http://localhost:3001/files/${fileId}`)
        .then((response) => {
          console.log("File deleted:", response.data);
          setFiles((prevFiles) =>
            prevFiles.filter((file) => file.filereq_id !== fileId)
          );
        })
        .catch((err) => {
          console.error("Error deleting file:", err);
          setError("Failed to delete file. Please try again.");
        });
    }
  };

  // Navigation functions
  const handleCreateVeri = () => navigate(`/CreateVeri?project_id=${projectId}`);
  const handleVerilist = () => navigate(`/VerificationList?project_id=${projectId}`);
  const handleCreateVar = () => navigate(`/CreateVar?project_id=${projectId}`);
  const handleVarilist = () => navigate(`/ValidationList?project_id=${projectId}`);
  const handleVerControl = () => {
    navigate(`/VersionControl?project_id=${projectId}`, { 
      state: { requirementList, projectName } 
    });
  };
  const handleVeriVar = () => navigate(`/VeriVaView?project_id=${projectId}`);
  const handleBaseline = () => navigate(`/Baseline?project_id=${projectId}`);
  
  const handleUploadSuccess = (newFile) => {
    console.log('New File:', newFile);
  
    // Update file list immediately
    setFiles((prevFiles) => {
      const exists = prevFiles.some(f => f.filereq_id === newFile.filereq_id);
      return exists ? prevFiles : [newFile, ...prevFiles];
    });
  
    // Fetch latest files from server
    axios
      .get(`http://localhost:3001/files?project_id=${projectId}`)
      .then((res) => {
        console.log('Fetched Files:', res.data);
        setFiles(res.data);
      })
      .catch((err) => {
        console.error("Error fetching updated files:", err);
      });
  };

  const formatRequirementId = (id) => {
    return `REQ-${id.toString().padStart(3, '0')}`;
  };

  // Get type badge class
  const getTypeBadgeClass = (type) => {
    switch(type) {
      case 'Functional': return 'REQfunctional';
      case 'User interface': return 'REQui';
      case 'External interfaces': return 'REQexternal';
      case 'Reliability': return 'REQreliability';
      case 'Maintenance': return 'REQmaintenance';
      case 'Portability': return 'REQportability';
      case 'Limitations Design and construction': return 'REQlimitations';
      case 'Interoperability': return 'REQinteroperability';
      case 'Reusability': return 'REQreusability';
      case 'Legal and regulative': return 'REQlegal';
      default: return '';
    }
  };

  // Render loading state
  const renderLoading = () => (
    <div className="REQloading-state">
      <div className="REQloading-spinner"></div>
      <p>Loading data...</p>
    </div>
  );

  // Empty state message
  const renderEmptyState = (message, buttonText, buttonAction) => (
    <div className="REQempty-state">
      <FontAwesomeIcon icon={faClipboardList} className="REQempty-icon" />
      <p>{message}</p>
      {buttonText && buttonAction && (
        <button className="REQempty-button" onClick={buttonAction}>
          <FontAwesomeIcon icon={faPlus} />
          {buttonText}
        </button>
      )}
    </div>
  );

  return (
    <div className="REQpage-wrapper">
      <Joyride
       steps={tutorialSteps}
       run={runTutorial} // ควบคุมการรันด้วย State
       continuous // ให้มีปุ่ม Next ตลอด
       showProgress // แสดงลำดับขั้นตอน
       showSkipButton // ให้มีปุ่ม Skip
       styles={{ // ปรับแต่งหน้าตา (ถ้าต้องการ)
         options: {
           zIndex: 10000, // ให้แสดงทับ Modal หรือ Element อื่นๆ
         },
       }}
       callback={(data) => { // จัดการเมื่อสถานะ Tutorial เปลี่ยน
         const { status } = data;
         if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
           // เมื่อ Tutorial จบ หรือถูกกด Skip
           setRunTutorial(false);
           localStorage.setItem('requirementPageTutorialShown', 'true'); // บันทึกว่าเคยดูแล้ว
         }
       }}
     />

      {/* Enterprise Header */}
      <div className="REQenterprise-header">
        <div className="REQheader-top">
          <div className="REQproject-info">
            <div className="REQproject-breadcrumb">
              <FontAwesomeIcon icon={faHome} />
              / Projects / {projectName || "wwww"}
            </div>
            <div className="REQproject-title">
              <h1 className="REQproject-name">{projectName || "WWWW"}</h1>
              <span className="REQrequirements-badge">REQUIREMENTS MANAGEMENT</span>
              <button
       onClick={handleRestartTutorial}
       className="tutorial-help-button tutorial-help-button-corner" // เพิ่ม class ไว้จัดสไตล์
       title="Show Tutorial"
     >
       <FontAwesomeIcon icon={faQuestionCircle} />
    </button>
            </div>
          </div>
          
        </div>
        
        <div className="REQheader-tab-bar">
          <div 
            className={`REQheader-tab ${activeTab === 'requirements' ? 'REQactive' : ''}`}
            onClick={() => setActiveTab('requirements')}
          >
            <FontAwesomeIcon icon={faListAlt} className="REQtab-icon" />
            Requirements
          </div>
          <div 
            className={`REQheader-tab ${activeTab === 'createVeri' ? 'REQactive' : ''}`}
            onClick={handleCreateVeri}
          >
            <FontAwesomeIcon icon={faPlus} className="REQtab-icon" />
            Create Verification
          </div>
          <div 
            className={`REQheader-tab ${activeTab === 'verification' ? 'REQactive' : ''}`}
            onClick={handleVerilist}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="REQtab-icon" />
            Verification List
          </div>
          <div 
            className={`REQheader-tab ${activeTab === 'createVar' ? 'REQactive' : ''}`}
            onClick={handleCreateVar}
          >
            <FontAwesomeIcon icon={faPlus} className="REQtab-icon" />
            Create Validation
          </div>
          
          <div 
            className={`REQheader-tab ${activeTab === 'validation' ? 'REQactive' : ''}`}
            onClick={handleVarilist}
          >
            <FontAwesomeIcon icon={faCheck} className="REQtab-icon" />
            Validation List
          </div>
        
          <div 
            className={`REQheader-tab ${activeTab === 'baseline' ? 'REQactive' : ''}`}
            onClick={handleBaseline}
          >
            <FontAwesomeIcon icon={faHistory} className="REQtab-icon" />
            Baseline
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="REQmain-content">
        {/* Toolbar Section */}
        <div className="REQtoolbar-section">
          <div className="REQtoolbar-left">
            <div className="REQsearch-container">
              <FontAwesomeIcon icon={faSearch} className="REQsearch-icon" />
              <input
                type="text"
                className="REQsearch-input"
                placeholder="Search requirements by ID, name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="REQclear-search-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
            <div className="REQfilter-dropdown">
              <select
                className="REQfilter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Filter by Type</option>
                <option value="Functional">Functionality</option>
                <option value="User interface">User Interface</option>
                <option value="External interfaces">External Interfaces</option>
                <option value="Reliability">Reliability</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Portability">Portability</option>
                <option value="Limitations Design and construction">Limitations Design</option>
                <option value="Interoperability">Interoperability</option>
                <option value="Reusability">Reusability</option>
                <option value="Legal and regulative">Legal & Regulative</option>
              </select>
            </div>
          </div>
          
            <div className="REQfilter-dropdown">
              <select
                className="REQfilter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Filter by Status</option>
                <option value="WORKING">Working</option>
                <option value="VERIFIED">Verified</option>
                <option value="VALIDATED">Validated</option>
                <option value="WAITING FOR VERIFICATION">Waiting for Verification</option>
                <option value="WAITING FOR VALIDATION">Waiting for Validation</option>
                <option value="BASELINE">Baseline</option>
              </select>
            </div>
            
          
          <div className="REQtoolbar-right">
            <button
              onClick={() => navigate(`/CreateRequirement?project_id=${projectId}`)}
              className="REQadd-requirement-button"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Requirement
            </button>
          </div>
        </div>

        {/* Requirements Table */}
        <div className="REQrequirements-card">
          <div className="REQcard-header">
            <div>
              <h2 className="REQcard-title">
                <FontAwesomeIcon icon={faTable} className="REQcard-icon" />
                Requirements
              </h2>
              <p className="REQcard-description">
                Manage and track all requirements for this project
              </p>
            </div>
          </div>
          
          <div className="REQtable-container">
            {loading ? (
              renderLoading()
            ) : error ? (
              <div className="REQerror-message">{error}</div>
            ) : filteredRequirements.length === 0 ? (
              renderEmptyState(
                "No requirements found. Add some requirements or adjust your filters.",
                "Add First Requirement",
                () => navigate(`/CreateRequirement?project_id=${projectId}`)
              )
            ) : (
              <table className="REQenterprise-table">
                <thead>
                  <tr>
                    <th className="REQid-column">ID</th>
                    <th className="REQname-column">NAME</th>
                    <th className="REQtype-column">TYPE</th>
                    <th className="REQstatus-column">STATUS</th>
                    <th className="REQactions-column">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.map((data) => (
                    <tr key={data.requirement_id} className="REQrequirement-row">
                      <td
                        className="REQreq-id-cell"
                        onClick={() =>
                          navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                            state: { requirement: data },
                          })
                        }
                      >
                        {formatRequirementId(data.requirement_id)}
                      </td>
                      <td
                        className="REQreq-name-cell"
                        onClick={() =>
                          navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                            state: { requirement: data },
                          })
                        }
                      >
                        {data.requirement_name}
                      </td>
                      <td
                        className="REQreq-type-cell"
                        onClick={() =>
                          navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                            state: { requirement: data },
                          })
                        }
                      >
                        <span className={`REQtype-badge ${getTypeBadgeClass(data.requirement_type)}`}>
                          {data.requirement_type}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="REQreq-status-cell">
                        <div
                          className={`REQstatus-badge 
                            ${data.requirement_status === 'VERIFIED' ? 'REQstatus-verified' : ''}
                            ${data.requirement_status === 'VALIDATED' ? 'REQstatus-validated' : ''} 
                            ${data.requirement_status === 'WORKING' ? 'REQstatus-working' : ''} 
                            ${data.requirement_status === 'WAITING FOR VERIFICATION' ? 'REQstatus-waiting-ver' : ''}
                            ${data.requirement_status === 'WAITING FOR VALIDATION' ? 'REQstatus-val-inprogress' : ''}
                            ${data.requirement_status === 'BASELINE' ? 'REQstatus-baseline' : ''}
                          `}
                        >
                          <span className="REQstatus-dot"></span>
                          {data.requirement_status}
                        </div>
                      </td>
                      
                      {/* Actions Buttons */}
                      <td className="REQreq-actions-cell">
                        <div className="REQaction-buttons-group">
                          <button
                            onClick={() =>
                              navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                                state: { requirement: data },
                              })
                            }
                            className="REQaction-button REQview-button"
                            title="View Requirement"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                `/UpdateRequirement?project_id=${projectId}&requirement_id=${data.requirement_id}`
                              )
                            }
                            className="REQaction-button REQedit-button"
                            title="Edit Requirement"
                          >
                            <FontAwesomeIcon icon={faPen} />
                          </button>

                          <button
                            onClick={() => handleDelete(data.requirement_id)}
                            className="REQaction-button REQdelete-button"
                            title="Delete Requirement"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* File Upload Section */}
        <div className="REQfiles-card">
          <div className="REQupload-header">
            <h2 className="REQupload-title">
              <FontAwesomeIcon icon={faFileAlt} className="REQcard-icon" />
              Uploaded Files
            </h2>
            <button onClick={handleOpenModal} className="REQupload-button">
              <FontAwesomeIcon icon={faPlus} /> 
              Add File
            </button>
          </div>

          <div className="REQtable-container">
            {loading ? (
              renderLoading()
            ) : error ? (
              <div className="REQerror-message">{error}</div>
            ) : files.length === 0 ? (
              renderEmptyState(
                "No files uploaded yet. Upload files using the 'Add File' button.",
                "Upload First File",
                handleOpenModal
              )
            ) : (
              <table className="REQtable-file">
                <thead>
                  <tr>
                    <th className="REQfile-id-column">FILE ID</th>
                    <th className="REQfile-name-column">FILE NAME</th>
                    <th className="REQfile-actions-column">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.filereq_id} className="REQfile-row">
                      <td className="REQfile-id-cell">{file.filereq_id}</td>
                      <td className="REQfile-name-cell">
                        <span className="REQfile-name-text">{file.filereq_name}</span>
                      </td>
                      <td className="REQfile-actions-cell">
                        <div className="REQfile-action-buttons">
                          <button
                            className="REQfile-button REQfile-view-button"
                            title="View File"
                            onClick={() => {
                              if (file?.filereq_id) {
                                navigate(`/ViewFile?filereq_id=${file.filereq_id}`, { state: { file } });
                              } else {
                                console.error("Invalid filereq_id:", file);
                              }
                            }}
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>

                          <button
                            className="REQfile-button REQfile-download-button"
                            title="Download File"
                            onClick={async () => {
                              try {
                                const fileId = file?.filereq_id;
                                if (!fileId) {
                                  alert("Invalid file ID");
                                  return;
                                }

                                const response = await fetch(`http://localhost:3001/files/${fileId}`);

                                if (!response.ok) {
                                  throw new Error(`Failed to fetch file: ${response.statusText}`);
                                }

                                const blob = await response.blob();
                                const fileURL = window.URL.createObjectURL(blob);
                                const link = document.createElement("a");

                                link.href = fileURL;
                                link.download = file.filereq_name.endsWith(".pdf") 
                                  ? file.filereq_name 
                                  : `${file.filereq_name}.pdf`;

                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);

                                window.URL.revokeObjectURL(fileURL);
                              } catch (error) {
                                console.error("Download error:", error);
                                alert("Failed to download file. Please try again.");
                              }
                            }}
                          >
                            <FontAwesomeIcon icon={faDownload} />
                          </button>

                          <button 
                            className="REQfile-button REQfile-delete-button" 
                            title="Delete File"
                            onClick={() => handleDeleteFile(file.filereq_id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal for UploadFile */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Upload File Modal"
        className="REQupload-file-modal"
        overlayClassName="REQmodal-overlay"
      >
        <UploadFile
          onClose={handleCloseModal}
          onUploadSuccess={handleUploadSuccess}
          projectId={projectId}
        />
      </Modal>
    </div>
  );
};

export default RequirementPage;