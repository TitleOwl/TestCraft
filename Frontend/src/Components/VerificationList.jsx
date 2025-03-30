import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride'; // Import Joyride
import { toast } from "react-toastify";
import axios from "axios";
import "./CSS/VerificationList.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faSearch, 
  faCheck, 
  faTimes, 
  faCalendarAlt, 
  faUser, 
  faClipboardCheck, 
  faClipboardList,
  faFilter,
  faArrowLeft,
  faSync,
  faPlus,
  faSortAmountDown,
  faSortAmountUp,
  faEye,
  faUsers,
  faListAlt,
  faCheckCircle,
  faQuestionCircle
} from "@fortawesome/free-solid-svg-icons";

const Modal = ({ show, onClose, requirements = [], verificationBy = [] }) => {
    if (!show) return null;

    // แปลงข้อมูล verificationBy จาก ["Name: value"] เป็น { name, value }
    const parsedVerificationBy = verificationBy.map((entry) => {
        const [name, value] = entry.split(": "); // แยกชื่อและค่าออกจากกัน
        return { name, value: value === "true" }; // แปลงค่า value เป็น boolean
    });

    return (
        <div className="modal-overlay-review">
            <div className="modal-content-review">
                <div className="modal-header">
                    <h3>Verification Details</h3>
                    <button className="close-modal-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="reviewer-section">
                        <h4>
                            <FontAwesomeIcon icon={faUsers} className="section-icon" /> 
                            Reviewers
                        </h4>
                        {parsedVerificationBy.length > 0 ? (
                            <div className="reviewers-list">
                                {parsedVerificationBy.map((reviewer, index) => (
                                    <div className="reviewer-item" key={index}>
                                        <div className="reviewer-avatar">
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                        <div className="reviewer-info">
                                            <span className="reviewer-name">{reviewer.name}</span>
                                            <span className={`reviewer-status ${reviewer.value ? 'verified' : 'not-verified'}`}>
                                                {reviewer.value ? 'Verified' : 'Not verified'}
                                            </span>
                                        </div>
                                        <FontAwesomeIcon 
                                            icon={reviewer.value ? faCheckCircle : faTimes} 
                                            className={`status-icon ${reviewer.value ? 'verified' : 'not-verified'}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-message">No verification by users found.</div>
                        )}
                    </div>
                    <div className="requirement-section">
                        <h4>
                            <FontAwesomeIcon icon={faClipboardList} className="section-icon" /> 
                            Requirements
                        </h4>
                        {requirements.length > 0 ? (
                            <div className="requirements-list">
                                {requirements.map((req, index) => (
                                    <div key={index} className="requirement-item">
                                        <FontAwesomeIcon icon={faClipboardCheck} className="req-icon" />
                                        <span className="req-id">REQ-{req.toString().padStart(3, '0')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-message">No requirements found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const VerificationList = () => {
    const [verifications, setVerifications] = useState([]);
    const [filteredVerifications, setFilteredVerifications] = useState([]);
    const [selectedRequirements, setSelectedRequirements] = useState([]);
    const [selectedVerificationBy, setSelectedVerificationBy] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [sortField, setSortField] = useState("id");
    const [sortDirection, setSortDirection] = useState("desc");
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const [runVerifyListTutorial, setRunVerifyListTutorial] = useState(false);
    const [verifyListTutorialSteps, setVerifyListTutorialSteps] = useState([
        {
            // target: '.verificationlist-table thead', // Target เดิม
            target: '.verificationlist-table',      // Target ใหม่: ชี้ไปที่ตารางทั้งตาราง
            content: 'หน้านี้แสดงรายการ Verification ที่รอการตรวจสอบทั้งหมดในตารางนี้ (ID, ผู้สร้าง, วันที่, สถานะ)', // ปรับ content
            placement: 'bottom', // หรือ 'top' อาจจะเหมาะกว่าเมื่อ target คือตาราง
            disableBeacon: true,
          },
      {
        // ชี้ไปที่ปุ่ม View Details (ตา) ของแถวแรก
        target: '.verification-row:first-child .view-details-btn',
        content: 'คลิกไอคอนรูปตาเพื่อดูรายละเอียด ว่าเกี่ยวข้องกับ Requirement ใดบ้าง และใครคือ Reviewers',
        placement: 'bottom',
      },
      {
        // ชี้ไปที่ปุ่ม Verify (เช็คถูก) ของแถวแรก
        target: '.verification-row:first-child .verify-btn',
        content: "เมื่อพร้อมตรวจสอบ Requirement เหล่านี้ คลิกปุ่ม 'Verify' เพื่อไปยังหน้าดำเนินการ",
        placement: 'bottom',
      },
    ]);

    useEffect(() => {
        // ตรวจสอบว่าเคยแสดง Tutorial หน้านี้หรือยัง
        const tutorialShown = localStorage.getItem('verifyListTutorialShown'); // ใช้ key ใหม่สำหรับหน้านี้
        if (!tutorialShown) {
          // หน่วงเวลาเล็กน้อยเพื่อให้ตารางมีข้อมูล render ก่อน
          const timer = setTimeout(() => {
            setRunVerifyListTutorial(true);
          }, 700); // อาจจะต้องปรับ delay นี้
          return () => clearTimeout(timer);
        }
      }, []);

      const handleRestartVerifyListTutorial = () => {
        setRunVerifyListTutorial(true);
      };

    const fetchVerifications = useCallback(() => {
        setLoading(true);
        axios
            .get(`http://localhost:3001/verifications?project_id=${projectId}`)
            .then((response) => {
                const filteredVerifications = response.data
                    .filter((verification) => verification.requirement_status === "WAITING FOR VERIFICATION")
                    .map((verification) => ({
                        ...verification,
                        verification_by: verification.verification_by || [],
                    }));
                setVerifications(filteredVerifications);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching verifications:", err);
                toast.error("Error fetching verifications.");
                setLoading(false);
            });
    }, [projectId]);

    useEffect(() => {
        fetchVerifications();
    }, [fetchVerifications]);

    // Filter and sort verifications when dependencies change
    useEffect(() => {
        let result = [...verifications];

        // Apply status filter
        if (statusFilter !== "all") {
            result = result.filter(item => item.requirement_status === statusFilter);
        }

        // Apply search filter
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(
                item => 
                    `verif-${item.id}`.toLowerCase().includes(lowerSearchTerm) ||
                    (item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm))
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let compareA, compareB;
            
            // Determine which field to sort by
            switch(sortField) {
                case "id":
                    compareA = a.id;
                    compareB = b.id;
                    break;
                case "date":
                    compareA = new Date(a.created_at);
                    compareB = new Date(b.created_at);
                    break;
                case "creator":
                    compareA = a.create_by;
                    compareB = b.create_by;
                    break;
                default:
                    compareA = a.id;
                    compareB = b.id;
            }
            
            // Handle string comparison
            if (typeof compareA === 'string' && typeof compareB === 'string') {
                return sortDirection === 'asc' 
                    ? compareA.localeCompare(compareB) 
                    : compareB.localeCompare(compareA);
            }
            
            // Handle other types
            return sortDirection === 'asc' 
                ? compareA - compareB 
                : compareB - compareA;
        });

        setFilteredVerifications(result);
    }, [verifications, searchTerm, sortField, sortDirection]);

    const handleViewDetails = (requirements, verificationBy) => {
        setSelectedRequirements(requirements || []);
        setSelectedVerificationBy(verificationBy || []);
        setShowModal(true);
    };

    const handleVerifyClick = (verificationId, selectedRequirements) => {
        if (!projectId || selectedRequirements.length === 0) {
            toast.error("Invalid project ID or no requirements selected.");
            return;
        }

        const storedUsername = localStorage.getItem("username");
        if (!storedUsername) {
            toast.error("No user found. Please log in.");
            return;
        }

        navigate(`/ReqVerification?project_id=${projectId}&verification_id=${verificationId}`, {
            state: { selectedRequirements, project_id: projectId, verification_id: verificationId },
        });
    };
    
    const handleBackToDashboard = () => {
        navigate(`/Dashboard?project_id=${projectId}`);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchVerifications().then(() => {
            setIsRefreshing(false);
            toast.success("Verifications refreshed successfully");
        }).catch(() => {
            setIsRefreshing(false);
        });
    };

    const handleSortChange = (field) => {
        if (sortField === field) {
            // If clicking the same field, toggle direction
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // If clicking a new field, set it as sort field and default to desc
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const closeModal = () => setShowModal(false);
    
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Loading state
    if (loading) {
        return (
            <div className="verificationlist-container">
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading verifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="verificationlist-container">
            <Joyride
        steps={verifyListTutorialSteps}
        run={runVerifyListTutorial}
        continuous
        showProgress
        showSkipButton
        styles={{
          options: {
            zIndex: 10000, // ให้แสดงทับ Modal หรือ elements อื่นๆ
          },
        }}
        callback={(data) => { // ลบ Type Annotation ออกสำหรับ JS
          const { status } = data;
          if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunVerifyListTutorial(false);
            localStorage.setItem('verifyListTutorialShown', 'true'); // ใช้ key ใหม่
          }
        }}
      />

      <div className="verificationlist-header">
         {/* ... ปุ่ม Back และ Title ... */}
         {/* ปุ่ม ? สำหรับเรียก Tutorial */}
         <button
           onClick={handleRestartVerifyListTutorial}
           className="tutorial-help-button tutorial-help-button-corner-vl" // ใช้ class ใหม่ หรือปรับ CSS เดิม
           title="Show Tutorial"
           style={{ /* อาจจะต้องปรับ Style เล็กน้อย */
             position: 'absolute',
             top: '15px',
             right: '20px',
             fontSize: '1.6rem',
             background: 'none',
             border: 'none',
             color: '#333', // ปรับสีตาม theme header ของหน้านี้
             cursor: 'pointer',
             zIndex: 5 // ทำให้แสดงเหนือ Header แต่ต่ำกว่า Joyride/Modal
           }}
         >
           <FontAwesomeIcon icon={faQuestionCircle} />
         </button>
      </div>
            <div className="verificationlist-header">
                <button className="verificationlist-back-btn" onClick={handleBackToDashboard}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faClipboardCheck} className="verificationlist-title-icon" />
                    Verification List
                </h1>
            </div>

            <div className="verificationlist-content">
                <div className="verificationlist-panel">
                    <div className="verificationlist-panel-header">
                        <h2>
                            <FontAwesomeIcon icon={faListAlt} /> 
                            Verification Requests
                            <span className="verificationlist-count-badge">{filteredVerifications.length}</span>
                        </h2>
                        
                        <div className="verificationlist-tools">
                            <div className="verificationlist-search">
                                <FontAwesomeIcon icon={faSearch} className="verificationlist-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by ID or creator..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="verificationlist-search-input"
                                />
                                {searchTerm && (
                                    <button 
                                        className="verificationlist-clear-search" 
                                        onClick={() => setSearchTerm("")}
                                        title="Clear search"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </div>
                            
                            
                            <button 
                                className={`verificationlist-refresh-btn ${isRefreshing ? 'refreshing' : ''}`} 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <FontAwesomeIcon icon={faSync} spin={isRefreshing} /> 
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="verificationlist-table-container">
                        {filteredVerifications.length === 0 ? (
                            <div className="verificationlist-empty-state">
                                <FontAwesomeIcon icon={faClipboardList} className="empty-icon" />
                                <p>No verifications match your criteria</p>
                                <p className="verificationlist-empty-subtitle">Try adjusting your search or filter settings</p>
                            </div>
                        ) : (
                            <table className="verificationlist-table">
                                <thead>
                                    <tr>
                                        <th>Verification ID</th>
                                        <th>Created By</th>
                                        <th>Date Assigned</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVerifications.map((verification) => (
                                        <tr key={verification.id} className="verification-row">
                                            <td className="req-id-cell">VERIF-{verification.id}</td>
                                            <td className="req-creator-cell">
                                                <div className="creator-info">
                                                    <FontAwesomeIcon icon={faUser} className="cell-icon" />
                                                    <span>{verification.create_by}</span>
                                                </div>
                                            </td>
                                            <td className="req-date-cell">
                                                <div className="date-info">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="cell-icon" />
                                                    <span>{formatDate(verification.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="req-status-cell">
                                                <span className={`req-status 
                                                    ${verification.requirement_status === "VERIFIED" 
                                                        ? 'status-verified' 
                                                        : verification.requirement_status === "REJECTED" 
                                                            ? 'status-rejected' 
                                                            : 'status-waiting'}`}>
                                                    WAITING FOR VERIFICATION
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <div className="action-buttons">
                                                    <button
                                                        className="view-details-btn"
                                                        title="View Details"
                                                        onClick={() =>
                                                            handleViewDetails(
                                                                verification.requirements || [],
                                                                verification.verification_by || []
                                                            )
                                                        }
                                                    >
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </button>
                                                    <button
                                                        className="verify-btn"
                                                        onClick={() =>
                                                            handleVerifyClick(verification.id, verification.requirements)
                                                        }
                                                        disabled={verification.requirement_status === "VERIFIED" || verification.requirement_status === "REJECTED"}
                                                    >
                                                        <FontAwesomeIcon icon={faCheck} className="button-icon" />
                                                        Verify
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

            <Modal
                show={showModal}
                onClose={closeModal}
                requirements={selectedRequirements}
                verificationBy={selectedVerificationBy}
            />
        </div>
    );
};

export default VerificationList;