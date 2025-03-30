import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateVar.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClipboardCheck,
  faListAlt,
  faCheck,
  faUsers,
  faTimes,
  faInfoCircle,
  faFilter,
  faSearch
} from "@fortawesome/free-solid-svg-icons";

const CreateVar = () => {
  const [verifiedRequirements, setVerifiedRequirements] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requirementsError, setRequirementsError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastId, setToastId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredRequirements, setFilteredRequirements] = useState([]);
  const [filterType, setFilterType] = useState("");
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  // Fetch verified requirements
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      axios
        .get(`http://localhost:3001/project/${projectId}/requirement`)
        .then((res) => {
          const verified = res.data.filter(
            (requirement) => requirement.requirement_status === "VERIFIED"
          );
          setVerifiedRequirements(verified);
          setRequirementsError(null);
        })
        .catch((error) => {
          console.error("Error fetching requirements:", error);
          setRequirementsError("Failed to load requirements. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [projectId]);
  
  // Filter requirements based on search and type filter
  useEffect(() => {
    let filtered = [...verifiedRequirements];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.requirement_name.toLowerCase().includes(query) ||
        `REQ-${req.requirement_id}`.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (filterType) {
      filtered = filtered.filter(req => req.requirement_type === filterType);
    }
    
    setFilteredRequirements(filtered);
  }, [verifiedRequirements, searchQuery, filterType]);

  // Handle select all requirements
  const handleSelectAll = () => {
    if (selectedRequirements.length === filteredRequirements.length) {
      // If all are selected, deselect all
      setSelectedRequirements([]);
    } else {
      // Otherwise, select all visible requirements
      setSelectedRequirements(filteredRequirements.map(req => req.requirement_id));
    }
  };

  // Generalized handle select for requirements
  const handleSelect = (id) => {
    setSelectedRequirements((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleCreateValidation = async () => {
    if (!projectId) {
      if (toastId) toast.dismiss(toastId);
      setToastId(toast.error("Invalid project ID."));
      return;
    }
  
    if (selectedRequirements.length === 0) {
      if (toastId) toast.dismiss(toastId);
      setToastId(toast.warning("Please select at least one requirement."));
      return;
    }
  
    const storedUsername = localStorage.getItem("username");
    const createBy = storedUsername;
  
    if (!createBy) {
      if (toastId) toast.dismiss(toastId);
      setToastId(toast.error("No user found. Please login again."));
      return;
    }
  
    const payload = {
      requirements: [...new Set(selectedRequirements)], // Unique requirements
      project_id: projectId,
      create_by: createBy,
    };
  
    if (isSubmitting) {
      if (toastId) toast.dismiss(toastId);
      setToastId(toast.warning("Submitting in progress. Please wait."));
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      const response = await axios.post("http://localhost:3001/createvalidation", payload);
  
      if (response.status === 201) {
        if (toastId) toast.dismiss(toastId);
        setToastId(toast.success("Validation created successfully!"));
  
        // Update frontend state
        setVerifiedRequirements((prev) =>
          prev.filter((req) => !selectedRequirements.includes(req.requirement_id))
        );
        setSelectedRequirements([]);
  
        // Loop through selected requirements and add them to history with status "WAITING FOR VALIDATION"
        for (const requirementId of selectedRequirements) {
          const historyReqData = {
            requirement_id: requirementId,
            requirement_status: "WAITING FOR VALIDATION",  // Set status to "WAITING FOR VALIDATION"
          };
  
          // Send to historyReqWorking
          const historyResponse = await axios.post(
            "http://localhost:3001/historyReqWorking",
            historyReqData
          );
  
          if (historyResponse.status !== 200) {
            console.error("Failed to add history for requirement:", requirementId);
          }
        }
  
      } else {
        if (toastId) toast.dismiss(toastId);
        setToastId(toast.error(response.data.message || "Failed to create validation."));
      }
    } catch (error) {
      console.error("Error creating validation:", error);
  
      const errorMessage =
        error.response?.data?.message || "An error occurred. Please try again.";
      if (toastId) toast.dismiss(toastId);
      setToastId(toast.error(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    if (toastId) {
      toast.dismiss(toastId);
    }
    navigate(`/Dashboard?project_id=${projectId}`);
  };

  // Get unique requirement types for filter dropdown
  const getUniqueTypes = () => {
    const types = new Set(verifiedRequirements.map(req => req.requirement_type));
    return Array.from(types);
  };

  // Format requirement ID with leading zeros
  const formatRequirementId = (id) => {
    return `REQ-${id.toString().padStart(3, '0')}`;
  };

  return (
    <div className="create-validation-container">
      <div className="createvar-header">
        <button className="createvar-back-btn" onClick={handleCancel}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1 className="createvar">
          <FontAwesomeIcon icon={faClipboardCheck} className="createvar-title-icon" /> 
          Create Validation
        </h1>
      </div>

      <div className="content">
        <div className="left-panel">
          <h2>
            <FontAwesomeIcon icon={faListAlt} className="panel-icon" /> 
            Requirements
            <span className="count-badge">{verifiedRequirements.length}</span>
          </h2>

          <div className="search-filter-container">
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="clear-search" 
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
            
            <div className="filter-box">
              <FontAwesomeIcon icon={faFilter} className="filter-icon" />
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Types</option>
                {getUniqueTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="select-all-container">
            <label>
              <input
                type="checkbox"
                checked={selectedRequirements.length === filteredRequirements.length && filteredRequirements.length > 0}
                onChange={handleSelectAll}
                disabled={filteredRequirements.length === 0}
              />
              <span>Select All</span>
            </label>
            <span className="selected-count">
              {selectedRequirements.length} of {filteredRequirements.length} selected
            </span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading requirements...</p>
            </div>
          ) : requirementsError ? (
            <div className="error-message">
              <FontAwesomeIcon icon={faTimes} className="error-icon" />
              {requirementsError}
            </div>
          ) : filteredRequirements.length === 0 ? (
            <div className="empty-state">
              <FontAwesomeIcon icon={faInfoCircle} className="empty-icon" />
              {verifiedRequirements.length === 0 ? (
                <p>No requirements found in 'VERIFIED' status.</p>
              ) : (
                <p>No requirements match your search criteria.</p>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="requirements-table">
                <thead>
                  <tr>
                    <th className="checkbox-column">Select</th>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequirements.map((req) => (
                    <tr 
                      key={req.requirement_id} 
                      className={selectedRequirements.includes(req.requirement_id) ? 'selected' : ''}
                      onClick={() => handleSelect(req.requirement_id)}
                    >
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedRequirements.includes(req.requirement_id)}
                          onChange={() => handleSelect(req.requirement_id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>{formatRequirementId(req.requirement_id)}</td>
                      <td className="name-cell">{req.requirement_name}</td>
                      <td>
                        <span className={`type-badge type-${req.requirement_type.toLowerCase().replace(/\s+/g, '-')}`}>
                          {req.requirement_type}
                        </span>
                      </td>
                      <td className="status-cell">
                        <span className="status-verified">
                          <FontAwesomeIcon icon={faCheck} className="status-icon" />
                          {req.requirement_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="right-panel">
          <h2>
            <FontAwesomeIcon icon={faUsers} className="panel-icon" /> 
            Summary
          </h2>
          
          <div className="summary-content">
            <div className="info-box">
              <FontAwesomeIcon icon={faInfoCircle} className="info-icon" />
              <p>
                Create a validation request for requirements that are already verified.
                Selected requirements will change to "WAITING FOR VALIDATION" status.
              </p>
            </div>
            
            <div className="selected-requirements">
              <h3>Selected Requirements</h3>
              {selectedRequirements.length === 0 ? (
                <p className="empty-selection">No requirements selected</p>
              ) : (
                <ul className="selected-list">
                  {selectedRequirements.map(reqId => {
                    const req = verifiedRequirements.find(r => r.requirement_id === reqId);
                    return req ? (
                      <li key={req.requirement_id} className="selected-item">
                        <span className="selected-id">{formatRequirementId(req.requirement_id)}</span>
                        <span className="selected-name">{req.requirement_name}</span>
                      </li>
                    ) : null;
                  })}
                </ul>
              )}
            </div>
          </div>
          
          <div className="summary-section">
            <h3>Validation Summary</h3>
            <div className="summary-item">
              <span>Total Verified Requirements:</span>
              <span className="summary-count">{verifiedRequirements.length}</span>
            </div>
            <div className="summary-item">
              <span>Requirements Selected:</span>
              <span className="summary-count">{selectedRequirements.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
        <button
          className="btn-create"
          onClick={handleCreateValidation}
          disabled={isSubmitting || selectedRequirements.length === 0}
        >
          <FontAwesomeIcon icon={faCheck} />
          {isSubmitting ? "Creating..." : "Create Validation"}
        </button>
      </div>
    </div>
  );
};

export default CreateVar;