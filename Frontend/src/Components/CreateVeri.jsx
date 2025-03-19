import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/CreateVeri.css";

// Import icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClipboardCheck, 
  faUsers, 
  faCheckCircle, 
  faTimes, 
  faArrowLeft,
  faSearch,
  faFilter,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const CreateVeri = () => {
  const [workingRequirements, setWorkingRequirements] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requirementsError, setRequirementsError] = useState(null);
  const [membersError, setMembersError] = useState(null);
  const [toastId, setToastId] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // สำหรับการค้นหา requirements
  const [filterType, setFilterType] = useState(""); // สำหรับกรองประเภท requirement
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  const navigate = useNavigate();

  // Fetch working requirements
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      axios
        .get(`http://localhost:3001/project/${projectId}/requirement`)
        .then((res) => {
          const working = res.data.filter(
            (requirement) => requirement.requirement_status === "WORKING"
          );
          setWorkingRequirements(working);
          setRequirementsError(null);
        })
        .catch(() => {
          setRequirementsError("Failed to load requirements. Please try again.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [projectId]);

  // Fetch project members
  useEffect(() => {
    if (projectId) {
      setIsLoadingMembers(true);
      axios
        .get(`http://localhost:3001/projectname?project_id=${projectId}`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setMembers(res.data);
            setMembersError(null);
          } else {
            setMembersError("Invalid project member data.");
          }
        })
        .catch(() => {
          setMembersError("Failed to load project members.");
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    }
  }, [projectId]);

  // Generalized handle select for requirements
  const handleSelect = (id, setter) => {
    setter((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // ฟังก์ชั่นเลือกทั้งหมด
  const handleSelectAll = () => {
    if (selectedRequirements.length === filteredRequirements.length) {
      // ถ้าเลือกทั้งหมดแล้ว ให้ยกเลิกการเลือกทั้งหมด
      setSelectedRequirements([]);
    } else {
      // ถ้ายังไม่ได้เลือกทั้งหมด ให้เลือกทั้งหมด
      setSelectedRequirements(filteredRequirements.map(req => req.requirement_id));
    }
  };

  // ฟังก์ชันสำหรับกรอง requirements ตามการค้นหาและประเภท
  const filteredRequirements = workingRequirements.filter(req => {
    const matchesSearch = 
      req.requirement_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `REQ-0${req.requirement_id}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType ? req.requirement_type === filterType : true;
    
    return matchesSearch && matchesType;
  });

  // ดึงประเภท requirement ที่มีทั้งหมด
  const requirementTypes = [...new Set(workingRequirements.map(req => req.requirement_type))];

  const handleCreateVerification = async () => {
    const selectedReviewerNames = Object.keys(selectedReviewers).filter(
      (name) => selectedReviewers[name]
    );
  
    if (!projectId) {
      toast.error("Invalid project ID.");
      return;
    }
  
    if (selectedRequirements.length === 0 || selectedReviewerNames.length === 0) {
      toast.warning("Please select at least one requirement and one reviewer.");
      return;
    }
  
    const storedUsername = localStorage.getItem("username");
    const createBy = storedUsername;
  
    if (!createBy) {
      toast.error("No user found. Please login again.");
      return;
    }
  
    const payload = {
      requirements: [...new Set(selectedRequirements)], // Remove duplicates
      reviewers: selectedReviewerNames.map((name) => `${name}: false`), // reviewers as array
      project_id: projectId,
      create_by: createBy,
    };
  
    console.log("Payload:", payload);
  
    try {
      setIsSubmitting(true);  // Disable submit button
      const response = await axios.post("http://localhost:3001/createveri", payload);
  
      if (response.status === 201) {
        const toastId = "create-verification-toast"; // Assign toastId
        if (!toast.isActive(toastId)) {  // Check if toast is active
          toast.success("Verification created successfully!", { toastId, position: "top-center" });
        }
  
        setWorkingRequirements((prev) =>
          prev.filter((req) => !selectedRequirements.includes(req.requirement_id))
        );
  
        setSelectedRequirements([]);
        setSelectedReviewers({});
  
        // Loop through selected requirements and add them to history with status "WAITING FOR VERIFICATION"
        for (const requirementId of selectedRequirements) {
          const historyReqData = {
            requirement_id: requirementId,
            requirement_status: "WAITING FOR VERIFICATION",
          };
  
          // ส่งข้อมูลไปที่ historyReqWorking
          const historyResponse = await axios.post(
            "http://localhost:3001/historyReqWorking",
            historyReqData
          );
  
          if (historyResponse.status !== 200) {
            console.error("Failed to add history for requirement:", requirementId);
          }
        }
  
        // Update the status of requirements in the Backend to "WAITING FOR VERIFICATION"
        const updateResults = await Promise.allSettled(
          selectedRequirements.map((requirementId) =>
            axios.put(`http://localhost:3001/update-requirements-status-waitingfor-ver/${requirementId}`, {
              requirement_status: "WAITING FOR VERIFICATION",
            })
          )
        );
  
      } else {
        toast.error(response.data.message || "Failed to create verification(s).");
      }
    } catch (error) {
      console.error("Error creating verification:", error);
      toast.error(error.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);  // Re-enable submit button
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    // Dismiss any active toast message with the specific toastId
    toast.dismiss("create-verification-toast");
    navigate(`/Dashboard?project_id=${projectId}`);
  };

  // Handle checkbox for reviewers
  const handleCheckboxReviewer = (memberName) => {
    setSelectedReviewers((prevState) => ({
      ...prevState,
      [memberName]: !prevState[memberName],
    }));
  };

  // เลือกผู้ตรวจสอบทั้งหมด
  const handleSelectAllReviewers = () => {
    // รวบรวมรายชื่อทั้งหมด
    const allReviewers = {};
    members.forEach(member => {
      try {
        const memberInfo = member.project_member ? JSON.parse(member.project_member) : [];
        memberInfo.forEach(info => {
          allReviewers[info.name] = true;
        });
      } catch (e) {
        console.error("Invalid JSON in member data:", e);
      }
    });

    // ตรวจสอบว่าได้เลือกทุกคนแล้วหรือไม่
    const allSelected = Object.keys(allReviewers).every(name => selectedReviewers[name]);
    
    if (allSelected) {
      // ถ้าเลือกทั้งหมดแล้ว ให้ยกเลิกการเลือกทั้งหมด
      setSelectedReviewers({});
    } else {
      // ถ้ายังไม่ได้เลือกทั้งหมด ให้เลือกทั้งหมด
      setSelectedReviewers(allReviewers);
    }
  };

  return (
    <div className="createveri-container">
      <div className="createveri-header">
        <button className="createveri-back-btn" onClick={handleCancel}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h1>
          <FontAwesomeIcon icon={faClipboardCheck} className="createveri-title-icon" />
          Create Verification
        </h1>
      </div>

      <div className="createveri-content">
        {/* Left Panel (Requirements Section) */}
        <div className="createveri-left-panel">
          <div className="createveri-panel-header">
            <h2>
              <FontAwesomeIcon icon={faClipboardCheck} /> Requirements
              {!loading && !requirementsError && (
                <span className="createveri-count-badge">
                  {workingRequirements.length}
                </span>
              )}
            </h2>

            <div className="createveri-tools">
              <div className="createveri-search">
                <FontAwesomeIcon icon={faSearch} className="createveri-search-icon" />
                <input
                  type="text"
                  placeholder="Search requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="createveri-search-input"
                />
                {searchQuery && (
                  <button 
                    className="createveri-clear-search" 
                    onClick={() => setSearchQuery("")}
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                )}
              </div>

              <div className="createveri-filter">
                <FontAwesomeIcon icon={faFilter} className="createveri-filter-icon" />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="createveri-filter-select"
                >
                  <option value="">All Types</option>
                  {requirementTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="createveri-loading">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading requirements...</p>
            </div>
          ) : requirementsError ? (
            <div className="createveri-error-message">
              <FontAwesomeIcon icon={faTimes} />
              <p>{requirementsError}</p>
            </div>
          ) : workingRequirements.length === 0 ? (
            <div className="createveri-empty-state">
              <p>No requirements found in 'WORKING' status.</p>
            </div>
          ) : (
            <>
              <div className="createveri-select-all">
                <input
                  type="checkbox"
                  id="select-all-requirements"
                  checked={selectedRequirements.length === filteredRequirements.length && filteredRequirements.length > 0}
                  onChange={handleSelectAll}
                />
                <label htmlFor="select-all-requirements">Select All</label>
                <span className="createveri-selected-count">
                  {selectedRequirements.length} of {filteredRequirements.length} selected
                </span>
              </div>

              <div className="createveri-table-container">
                <table className="createveri-requirements-table">
                  <thead>
                    <tr>
                      <th className="createveri-checkbox-column">Select</th>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequirements.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="createveri-no-results">
                          No requirements match your search
                        </td>
                      </tr>
                    ) : (
                      filteredRequirements.map((req) => (
                        <tr key={req.requirement_id} className={selectedRequirements.includes(req.requirement_id) ? "selected-row" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRequirements.includes(req.requirement_id)}
                              onChange={() =>
                                handleSelect(req.requirement_id, setSelectedRequirements)
                              }
                            />
                          </td>
                          <td className="req-id">REQ-{String(req.requirement_id).padStart(3, '0')}</td>
                          <td>{req.requirement_name}</td>
                          <td>
                            <span className={`req-type type-${req.requirement_type.toLowerCase().replace(/\s+/g, '-')}`}>
                              {req.requirement_type}
                            </span>
                          </td>
                          <td>
                            <span className="req-status status-working">
                              {req.requirement_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Right Panel (Reviewers Section) */}
        <div className="createveri-right-panel">
          <div className="createveri-panel-header">
            <h2>
              <FontAwesomeIcon icon={faUsers} /> Reviewers
            </h2>
          </div>

          {isLoadingMembers ? (
            <div className="createveri-loading">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading reviewers...</p>
            </div>
          ) : membersError ? (
            <div className="createveri-error-message">
              <FontAwesomeIcon icon={faTimes} />
              <p>{membersError}</p>
            </div>
          ) : members.length === 0 ? (
            <div className="createveri-empty-state">
              <p>No reviewers found.</p>
            </div>
          ) : (
            <div className="createveri-reviewers-container">
              <div className="createveri-select-all">
                <input
                  type="checkbox"
                  id="select-all-reviewers"
                  checked={
                    Object.keys(selectedReviewers).length > 0 &&
                    members.every(member => {
                      try {
                        const memberInfo = member.project_member ? JSON.parse(member.project_member) : [];
                        return memberInfo.every(info => selectedReviewers[info.name]);
                      } catch (e) {
                        return false;
                      }
                    })
                  }
                  onChange={handleSelectAllReviewers}
                />
                <label htmlFor="select-all-reviewers">Select All Reviewers</label>
              </div>

              <div className="createveri-reviewers-list">
                {members.map((member, index) => {
                  let memberInfo = [];
                  try {
                    memberInfo = member.project_member
                      ? JSON.parse(member.project_member)
                      : [];
                  } catch (e) {
                    console.error("Invalid JSON in member data:", e);
                    return null;
                  }

                  return (
                    <div key={index} className="createveri-members-group">
                      {memberInfo.map((info, roleIndex) => (
                        <div key={roleIndex} className="createveri-reviewer-item">
                          <input
                            type="checkbox"
                            id={`reviewer-${info.name}-${roleIndex}`}
                            checked={selectedReviewers[info.name] || false}
                            onChange={() => handleCheckboxReviewer(info.name)}
                          />
                          <label htmlFor={`reviewer-${info.name}-${roleIndex}`} className="createveri-reviewer-label">
                            <div className="createveri-reviewer-name">{info.name}</div>
                            <div className="createveri-reviewer-role">{info.roles}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selection Summary */}
          <div className="createveri-summary">
            <h3>Selection Summary</h3>
            <div className="createveri-summary-item">
              <span>Requirements:</span>
              <span className="createveri-summary-count">{selectedRequirements.length}</span>
            </div>
            <div className="createveri-summary-item">
              <span>Reviewers:</span>
              <span className="createveri-summary-count">
                {Object.values(selectedReviewers).filter(Boolean).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="createveri-action-buttons">
        <button
          className="createveri-btn-create"
          onClick={handleCreateVerification}
          disabled={isSubmitting || selectedRequirements.length === 0 || Object.values(selectedReviewers).filter(Boolean).length === 0}
        >
          {isSubmitting ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin /> Creating...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheckCircle} /> Create Verification
            </>
          )}
        </button>
        <button className="createveri-btn-cancel" onClick={handleCancel}>
          <FontAwesomeIcon icon={faTimes} /> Cancel
        </button>
      </div>
    </div>
  );
};

export default CreateVeri;