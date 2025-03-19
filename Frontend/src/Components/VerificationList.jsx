import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import "./CSS/VerificationList.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faCheck, faTimes, faCalendarAlt, faUser, faClipboardCheck, faClipboardList } from "@fortawesome/free-solid-svg-icons";

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
                <div className="reviewer-section">
                    <h3>
                        <FontAwesomeIcon icon={faUser} className="section-icon" /> 
                        Reviewers
                    </h3>
                    {parsedVerificationBy.length > 0 ? (
                        parsedVerificationBy.map((reviewer, index) => (
                            <div className="list-reviewer" key={index}>
                                <span>{reviewer.name}</span>
                                <FontAwesomeIcon 
                                    icon={reviewer.value ? faCheck : faTimes} 
                                    className={`status-icon ${reviewer.value ? 'verified' : 'not-verified'}`}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="empty-message">No verification by users found.</div>
                    )}
                </div>
                <div className="requirement-section">
                    <h3>
                        <FontAwesomeIcon icon={faClipboardList} className="section-icon" /> 
                        Requirements
                    </h3>
                    {requirements.length > 0 ? (
                        requirements.map((req, index) => (
                            <div key={index} className="req-review">
                                <FontAwesomeIcon icon={faClipboardCheck} className="req-icon" />
                                <span>REQ-{req.toString().padStart(3, '0')}</span>
                            </div>
                        ))
                    ) : (
                        <div className="empty-message">No requirements found.</div>
                    )}
                </div>
                <button className="close-modal-review-button" onClick={onClose}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>
            </div>
        </div>
    );
};

const VerificationList = () => {
    const [verifications, setVerifications] = useState([]);
    const [selectedRequirements, setSelectedRequirements] = useState([]);
    const [selectedVerificationBy, setSelectedVerificationBy] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

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

    const handleSearchClick = (requirements, verificationBy) => {
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

    const closeModal = () => setShowModal(false);
    
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Loading state
    if (loading) {
        return (
            <div className="verification-list-container">
                <h1>Verification List</h1>
                <div className="loading-state">
                    <div className="loading-spinner"></div>
                    <p>Loading verifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="verification-list-container">
            <h1>
                <FontAwesomeIcon icon={faClipboardCheck} className="title-icon" />
                Verification List
            </h1>
            
            {verifications.length === 0 ? (
                <div className="empty-state">
                    <FontAwesomeIcon icon={faClipboardList} className="empty-icon" />
                    <p>No verifications are currently waiting for review.</p>
                    <p className="text-secondary">All verifications have been processed or none have been created yet.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="verification-table">
                        <thead>
                            <tr>
                                <th>Verification ID</th>
                                <th>Created By</th>
                                <th>Date Assigned</th>
                                <th>Status</th>
                                <th>Reviewers</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {verifications.map((verification) => (
                                <tr key={verification.id} className="verification-row">
                                    <td className="id-cell">VERIF-{verification.id}</td>
                                    <td className="creator-cell">
                                        <div className="creator-info">
                                            <FontAwesomeIcon icon={faUser} className="cell-icon" />
                                            <span>{verification.create_by}</span>
                                        </div>
                                    </td>
                                    <td className="date-cell">
                                        <div className="date-info">
                                            <FontAwesomeIcon icon={faCalendarAlt} className="cell-icon" />
                                            <span>{formatDate(verification.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="status-cell">
                                        <span className="status-badge waiting">
                                            {verification.requirement_status || "WAITING FOR VERIFICATION"}
                                        </span>
                                    </td>
                                    <td className="reviewer-cell">
                                        <button
                                            className="search-icon-button"
                                            title="View Reviewers and Requirements"
                                            onClick={() =>
                                                handleSearchClick(
                                                    verification.requirements || [],
                                                    verification.verification_by || []
                                                )
                                            }
                                        >
                                            <FontAwesomeIcon icon={faSearch} />
                                        </button>
                                    </td>
                                    <td className="action-cell">
                                        <button
                                            className="verify-button"
                                            onClick={() =>
                                                handleVerifyClick(verification.id, verification.requirements)
                                            }
                                        >
                                            <FontAwesomeIcon icon={faCheck} className="button-icon" />
                                            Verify
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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