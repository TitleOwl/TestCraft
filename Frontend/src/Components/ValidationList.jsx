import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./CSS/ValidationList.css";
import closemodalreview from "../image/close.png";

const Modal = ({ show, onClose, requirements = [] }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay-review">
      <div className="modal-content-review">
        <div>
          <h3>Requirements for Validation</h3>
          {Array.isArray(requirements) && requirements.length > 0 ? (
            requirements.map((req, index) => (
              <div key={index} className="req-review">
                REQ-{String(req).padStart(3, '0')}
              </div>
            ))
          ) : (
            <div className="empty-requirements">No requirements found.</div>
          )}
        </div>
        <button className="close-modal-review-button" onClick={onClose}>
          <img src={closemodalreview} alt="Close Modal" className="closemodalreview-icon" />
        </button>
      </div>
    </div>
  );
};

// Custom status badge component
const StatusBadge = ({ status }) => {
  let statusClass = "";
  
  switch (status) {
    case "WAITING FOR VALIDATION":
      statusClass = "waiting";
      break;
    default:
      statusClass = "";
  }
  
  return <span className={`status-badge ${statusClass}`}>{status}</span>;
};

const ValidationList = () => {
  const [validations, setValidations] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  const fetchValidations = useCallback(() => {
    setLoading(true);
    setError("");
    
    axios
      .get(`http://localhost:3001/validations?project_id=${projectId}`)
      .then((response) => {
        console.log("API Response:", response.data);
        const filteredValidations = response.data
          .filter((validation) => validation.requirement_status === "WAITING FOR VALIDATION")
          .map((validation) => ({
            ...validation,
            validation_by: validation.validation_by || [],
          }));
        setValidations(filteredValidations);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching validations:", err);
        setError("Failed to load validations. Please try again.");
        setLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    fetchValidations();
  }, [fetchValidations]);

  const handleSearchClick = (requirements) => {
    console.log("Requirements to display in modal:", requirements);
    setSelectedRequirements(requirements || []);
    setShowModal(true);
  };

  const handleValidateClick = (validationId, selectedRequirements) => {
    if (!projectId || selectedRequirements.length === 0) {
      alert("Invalid project ID or no requirements selected.");
      return;
    }

    const storedUsername = localStorage.getItem("username");

    if (!storedUsername) {
      alert("No user found. Please log in.");
      return;
    }

    navigate(`/ReqValidation?project_id=${projectId}&validation_id=${validationId}`, {
      state: { selectedRequirements, project_id: projectId, validation_id: validationId },
    });
  };

  const closeModal = () => setShowModal(false);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="validation-list-container">
      <h1>Validation List</h1>
      
      {loading ? (
        <div className="loading-message"></div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : validations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No validations are currently available for review.</p>
        </div>
      ) : (
        <table className="validation-table">
          <thead>
            <tr>
              <th>Validation ID</th>
              <th>Created By</th>
              <th>Date Assigned</th>
              <th>Status</th>
              <th>Requirements</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {validations.map((validation) => (
              <tr key={validation.id}>
                <td>VAL-{String(validation.id).padStart(3, '0')}</td>
                <td>{validation.create_by}</td>
                <td>{formatDate(validation.created_at)}</td>
                <td>
                  <StatusBadge status={validation.requirement_status || "UNKNOWN"} />
                </td>
                <td>
                  <button
                    className="search-icon-button"
                    title="View Requirements"
                    onClick={() => handleSearchClick(validation.requirements || [])}
                  >
                    <span role="img" aria-label="search">🔍</span>
                  </button>
                </td>
                <td>
                  <button
                    className="verify-button"
                    onClick={() =>
                      handleValidateClick(validation.id, validation.requirements)
                    }
                  >
                    Validate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal show={showModal} onClose={closeModal} requirements={selectedRequirements} />
    </div>
  );
};

export default ValidationList;