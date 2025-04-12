import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/ValidationList.css";

// Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const ValidateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="validation-title-icon">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const SortIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"></path>
  </svg>
);

// Modal component for showing requirements
const ValidationModal = ({ show, onClose, requirements = [] }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Requirements for Validation</h3>
          <button className="close-modal-button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          {Array.isArray(requirements) && requirements.length > 0 ? (
            <div className="requirements-list">
              {requirements.map((req, index) => (
                <div key={index} className="requirement-item">
                  <div className="requirement-icon">
                    <SearchIcon />
                  </div>
                  <span className="requirement-id">REQ-{String(req).padStart(3, '0')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-requirements">No requirements found.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom status badge component
const ValidationStatusBadge = ({ status }) => {
  let statusClass = "";
  let statusIcon = null;
  
  switch (status) {
    case "WAITING FOR VALIDATION":
      statusClass = "waiting";
      statusIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      );
      break;
    case "VALIDATED":
      statusClass = "validated";
      statusIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
      break;
    case "REJECTED":
      statusClass = "rejected";
      statusIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      );
      break;
    default:
      statusClass = "";
  }
  
  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-icon">{statusIcon}</span>
      <span className="status-text">{status}</span>
    </span>
  );
};

// Confirmation modal component
const ConfirmationModal = ({ show, onClose, onConfirm, title, message }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal-content confirm-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-modal-button" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <p className="confirm-message">{message}</p>
          <div className="confirm-buttons">
            <button className="cancel-button" onClick={onClose}>Cancel</button>
            <button className="confirm-button" onClick={onConfirm}>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading state component
const LoadingState = () => (
  <div className="loading-state">
    <div className="loading-spinner"></div>
    <p>Loading validations...</p>
  </div>
);

// Error state component
const ErrorState = ({ message }) => (
  <div className="error-state">
    <div className="error-icon">⚠️</div>
    <h3>Error</h3>
    <p>{message}</p>
  </div>
);

const ValidationList = () => {
  const [validations, setValidations] = useState([]);
  const [filteredValidations, setFilteredValidations] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  const [confirmModal, setConfirmModal] = useState({ show: false, validation: null });
  
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
    if (projectId) {
      fetchValidations();
    } else {
      setError("No project ID specified");
      setLoading(false);
    }
  }, [fetchValidations, projectId]);
  
  useEffect(() => {

    let result = [...validations];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(validation => 
        String(validation.id).includes(term) || 
        (validation.create_by && validation.create_by.toLowerCase().includes(term))
      );
    }
    

    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredValidations(result);
  }, [validations, searchTerm, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prevSortConfig => {
      if (prevSortConfig.key === key) {
        return {
          key,
          direction: prevSortConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };
  
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? 'asc' : 'desc';
  };

  const handleSearchClick = (requirements) => {
    console.log("Requirements to display in modal:", requirements);
    setSelectedRequirements(requirements || []);
    setShowModal(true);
  };

  const handleValidateClick = (validation) => {
    if (!projectId || !validation || !validation.requirements || validation.requirements.length === 0) {
      toast.warning("Invalid project ID or no requirements selected.");
      return;
    }

    const storedUsername = localStorage.getItem("username");

    if (!storedUsername) {
      toast.error("No user found. Please log in.");
      return;
    }
    
    if (validation.requirement_status !== "WAITING FOR VALIDATION") {
      setConfirmModal({
        show: true,
        validation,
        title: "Validation Already Processed",
        message: "This validation has already been processed. Do you still want to review it?"
      });
      return;
    }
    
    navigateToValidation(validation);
  };
  
  const navigateToValidation = (validation) => {
    navigate(`/ReqValidation?project_id=${projectId}&validation_id=${validation.id}`, {
      state: { 
        selectedRequirements: validation.requirements, 
        project_id: projectId, 
        validation_id: validation.id 
      },
    });
  };
  
  const confirmValidateClick = () => {
    if (confirmModal.validation) {
      navigateToValidation(confirmModal.validation);
    }
    setConfirmModal({ show: false, validation: null });
  };
  
  const handleRefresh = () => {
    fetchValidations();
  };
  
  const goBack = () => {
    navigate(-1);
  };

  const closeModal = () => setShowModal(false);
  const closeConfirmModal = () => setConfirmModal({ show: false, validation: null });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="validation-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <button className="createvar-back-btn" onClick={goBack}>
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="header-title">
          <ValidateIcon />
          <h1>Validation List</h1>
        </div>
        <div className="header-right">
          <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      <div className="dashboard-controls">
        <div className="search-container">
          <SearchIcon />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ID or creator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-search-button"
              onClick={() => setSearchTerm("")}
            >
              <CloseIcon />
            </button>
          )}
        </div>
        
      </div>

      <div className="dashboard-content">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />

        ) : (
          <div className="table-container">
            <table className="validation-table">
              <thead>
                <tr>
                  <th 
                    className={`col-id ${getSortIndicator('id')}`}
                    onClick={() => handleSort('id')}
                  >
                    <span>Validation ID</span>
                    <SortIcon />
                  </th>
                  <th 
                    className={`col-creator ${getSortIndicator('create_by')}`}
                    onClick={() => handleSort('create_by')}
                  >
                    <span>Created By</span>
                    <SortIcon />
                  </th>
                  <th 
                    className={`col-date ${getSortIndicator('created_at')}`}
                    onClick={() => handleSort('created_at')}
                  >
                    <span>Date Assigned</span>
                    <SortIcon />
                  </th>
                  <th className="col-status">Status</th>
                  <th className="col-requirements">Requirements</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredValidations.map((validation) => (
                  <tr key={validation.id} className="validation-row">
                    <td className="col-id">
                      <span className="val-id">VAL-{String(validation.id).padStart(3, '0')}</span>
                    </td>
                    <td className="col-creator">
                      <div className="creator-info">
                        <UserIcon />
                        <span>{validation.create_by || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="col-date">
                      <div className="date-info">
                        <CalendarIcon />
                        <span>{formatDate(validation.created_at)}</span>
                      </div>
                    </td>
                    <td className="col-status">
                      <ValidationStatusBadge status={validation.requirement_status || "UNKNOWN"} />
                    </td>
                    <td className="col-requirements">
                      <button
                        className="view-requirements-button"
                        title="View Requirements"
                        onClick={() => handleSearchClick(validation.requirements || [])}
                      >
                        <SearchIcon />
                        <span>View</span>
                      </button>
                    </td>
                    <td className="col-actions">
                      <button
                        className={`validate-button ${validation.requirement_status !== "WAITING FOR VALIDATION" ? 'disabled' : ''}`}
                        onClick={() => handleValidateClick(validation)}
                        disabled={validation.requirement_status !== "WAITING FOR VALIDATION"}
                      >
                        <CheckIcon />
                        <span>Validate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modals */}
      <ValidationModal 
        show={showModal} 
        onClose={closeModal} 
        requirements={selectedRequirements} 
      />
      
      <ConfirmationModal
        show={confirmModal.show}
        onClose={closeConfirmModal}
        onConfirm={confirmValidateClick}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
};

export default ValidationList;