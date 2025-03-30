import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Comment from "./Comment";
import "./CSS/ReqVerification.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClipboardCheck,
  faListAlt,
  faCheck,
  faComment,
  faTimes,
  faInfoCircle,
  faExclamationTriangle,
  faCheckCircle
} from "@fortawesome/free-solid-svg-icons";

const ReqVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const verificationId = queryParams.get("verification_id");
  const { selectedRequirements } = location.state || {};
  const [reqcriList, setReqcriList] = useState([]);
  const [requirementsDetails, setRequirementsDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkboxState, setCheckboxState] = useState({});
  
  // Alert state
  const [alertType, setAlertType] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const alertRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  useEffect(() => {
    if (!projectId || !verificationId) {
      console.error("Project ID or Verification ID is missing.");
      navigate("/VerificationList");
      return;
    }
  
    fetchCriteria();
  
    if (selectedRequirements && selectedRequirements.length > 0) {
      fetchRequirementsDetails(selectedRequirements);
    }
    
    // Clean up alert timeout on unmount
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [projectId, verificationId, selectedRequirements, navigate]);
  
  const fetchCriteria = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3001/reqcriteria", {
        params: { project_id: projectId },
      });
  
      const initialCheckboxState = response.data.reduce((acc, criteria) => {
        acc[criteria.reqcri_id] = false;
        return acc;
      }, {});
  
      setReqcriList(response.data);
  
      const storedUsername = localStorage.getItem("username");
      if (storedUsername) {
        const storedCheckboxState = localStorage.getItem(
          `checkboxState_${storedUsername}_${projectId}`
        );
  
        if (storedCheckboxState) {
          setCheckboxState(JSON.parse(storedCheckboxState));
        } else {
          setCheckboxState(initialCheckboxState);
        }
      }
    } catch (error) {
      console.error("Error fetching criteria:", error);
      showCustomAlert("error", "Failed to load criteria. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRequirementsDetails = async (requirements) => {
    try {
      const response = await axios.get("http://localhost:3001/requirements", {
        params: { requirement_ids: requirements },
      });
      setRequirementsDetails(response.data);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      showCustomAlert("error", "Failed to load requirements. Please try again.");
    }
  };

  const handleCheckboxChange = (id) => {
    const updatedState = {
      ...checkboxState,
      [id]: !checkboxState[id],
    };
    setCheckboxState(updatedState);

    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      localStorage.setItem(
        `checkboxState_${storedUsername}_${projectId}_${verificationId}`,
        JSON.stringify(updatedState)
      );
    }
  };

  // Custom alert function
  const showCustomAlert = (type, message) => {
    setAlertType(type);
    setAlertMessage(message);
    setShowAlert(true);
    
    // Auto-hide after 5 seconds
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    
    alertTimeoutRef.current = setTimeout(() => {
      setShowAlert(false);
    }, 5000);
  };
  
  const handleCloseAlert = () => {
    setShowAlert(false);
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
  };
  
  const navigateBack = () => {
    navigate(`/VerificationList?project_id=${projectId}`);
  };

  const handleSave = async () => {
    const allChecked = Object.values(checkboxState).every((value) => value);
  
    if (!allChecked) {
      showCustomAlert("warning", "Criteria checklist saved, but not all items are checked");
      
      // Wait for alert animation to finish, then navigate
      setTimeout(() => {
        navigate(`/VerificationList?project_id=${projectId}`);
      }, 1500);
      return;
    }
  
    try {
      const storedUsername = localStorage.getItem("username");
      if (!storedUsername) {
        showCustomAlert("error", "Please log in first.");
        return;
      }
  
      const response = await axios.get("http://localhost:3001/verifications", {
        params: { project_id: projectId, verification_id: verificationId },
      });
  
      const verification = response.data.find((v) => v.id === parseInt(verificationId));
  
      if (verification) {
        const updatedVerificationBy = verification.verification_by.map((entry) => {
          const [username, status] = entry.split(":").map((item) => item.trim());
          if (username === storedUsername) {
            return `${username}: true`;
          }
          return entry;
        });
  
        await axios.put("http://localhost:3001/update-verification-true", {
          project_id: projectId,
          verification_id: verificationId,
          verification_by: updatedVerificationBy,
        });
  
        const allVerified = updatedVerificationBy.every((entry) => {
          const [, status] = entry.split(":").map((item) => item.trim());
          return status === "true";
        });
  
        if (allVerified) {
          const requirementIds = requirementsDetails.map((req) => req.requirement_id);
          
          if (!requirementIds || requirementIds.length === 0) {
            showCustomAlert("error", "No requirements found to update.");
            return;
          }
  
          try {
            await axios.put(
              "http://localhost:3001/update-requirements-status-verified",
              {
                requirement_ids: requirementIds,
                requirement_status: "VERIFIED",
              }
            );
  
            for (const requirementId of requirementIds) {
              const historyReqData = {
                requirement_id: requirementId,
                requirement_status: "VERIFIED",
              };
  
              const historyResponse = await axios.post(
                "http://localhost:3001/historyReqWorking",
                historyReqData
              );
  
              if (historyResponse.status !== 200) {
                console.error("Failed to add history for requirement:", requirementId);
              }
            }
  
            showCustomAlert("success", "All criteria verified! Status updated to VERIFIED");
            
            // Wait for alert animation to finish, then navigate
            setTimeout(() => {
              navigate(`/Dashboard?project_id=${projectId}`);
            }, 1500);
          } catch (error) {
            console.error("Error updating requirement status:", error);
            showCustomAlert("error", "Failed to update requirements status");
          }
        } else {
          showCustomAlert("warning", "Not all users have verified. Please wait for everyone to verify.");
          
          // Wait for alert animation to finish, then navigate
          setTimeout(() => {
            navigate(`/VerificationList?project_id=${projectId}`);
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Error updating verification status:", error);
      showCustomAlert("error", "Failed to update verification status. Please try again.");
    }
  };
  
  return (
    <div className="reqveri-container">
      <div className="reqveri-header">
        <button className="reqveri-back-btn" onClick={navigateBack}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="reqveri-title">
          <FontAwesomeIcon icon={faClipboardCheck} className="reqveri-title-icon" />
          Verification Requirement
        </h1>
      </div>

      <div className="reqveri-flex-container">
        <div className="reqveri-box">
          <h2>
            <FontAwesomeIcon icon={faListAlt} className="reqveri-icon" />
            Checklist
          </h2>
          {loading ? (
            <div className="reqveri-loading">
              <div className="reqveri-spinner"></div>
              <span>Loading...</span>
            </div>
          ) : (
            <ul className="reqveri-checklist">
              {reqcriList.map((criteria) => (
                <li key={criteria.reqcri_id}>
                  <label>
                    <input
                      type="checkbox"
                      className="reqveri-checkbox"
                      checked={checkboxState[criteria.reqcri_id] || false}
                      onChange={() => handleCheckboxChange(criteria.reqcri_id)}
                    />
                    {criteria.reqcri_name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="reqveri-box">
          <h2>
            <FontAwesomeIcon icon={faComment} className="reqveri-icon" />
            Comments
          </h2>
          <div className="reqveri-comment-container">
            <Comment verificationId={verificationId} />
          </div>
        </div>
      </div>

      <div className="reqveri-box reqveri-requirements">
        <h2>
          <FontAwesomeIcon icon={faClipboardCheck} className="reqveri-icon" />
          Requirements
        </h2>
        <table className="reqveri-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Requirements Statement</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {requirementsDetails.length > 0 ? (
              requirementsDetails.map((req, index) => (
                <tr key={index}>
                  <td>REQ-{req.requirement_id.toString().padStart(3, '0')}</td>
                  <td>{req.requirement_name}</td>
                  <td>{req.requirement_type}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center' }}>No requirements details found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="reqveri-button-container">
        <button className="reqveri-cancel-button" onClick={navigateBack}>
          Cancel
        </button>
        <button className="reqveri-save-button" onClick={handleSave}>
          <FontAwesomeIcon icon={faCheck} />
          Save
        </button>
      </div>
      
      {/* Custom Alert Component */}
      {showAlert && (
        <div className={`reqveri-alert show`} ref={alertRef}>
          <div className={`reqveri-alert-${alertType}`}>
            <div className="reqveri-alert-content">
              <div className="reqveri-alert-icon">
                {alertType === 'success' && <FontAwesomeIcon icon={faCheckCircle} />}
                {alertType === 'error' && <FontAwesomeIcon icon={faTimes} />}
                {alertType === 'warning' && <FontAwesomeIcon icon={faExclamationTriangle} />}
              </div>
              <span className="reqveri-alert-message">{alertMessage}</span>
            </div>
            <button className="reqveri-alert-close" onClick={handleCloseAlert}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="reqveri-alert-progress"></div>
        </div>
      )}
    </div>
  );
};

export default ReqVerification;