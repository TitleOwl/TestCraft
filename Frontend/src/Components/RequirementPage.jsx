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
  faCodeBranch
} from "@fortawesome/free-solid-svg-icons";
import { FileAddOutlined } from "@ant-design/icons";
import Modal from "react-modal";
import UploadFile from "./Uploadfile";
import "./CSS/RequirementPage.css";
import "jspdf-autotable";
import clearsearch from '../image/clearsearch.png';

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
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

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

    // Fetch files (ไม่ต้องผูกกับ requirement)
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
  const handleBaseline = () => navigate(`/Baseline?project_id=${projectId}`);
  
  const handleUploadSuccess = (newFile) => {
    // เพิ่มการ log เพื่อตรวจสอบข้อมูล
    console.log('New File:', newFile);
  
    // อัปเดตรายการไฟล์ทันที
    setFiles((prevFiles) => {
      // ตรวจสอบว่าไฟล์มีอยู่แล้วหรือไม่
      const exists = prevFiles.some(f => f.filereq_id === newFile.filereq_id);
      return exists ? prevFiles : [newFile, ...prevFiles];
    });
  
    // ดึงรายการไฟล์ล่าสุดจากเซิร์ฟเวอร์
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

  // Render loading state
  const renderLoading = () => (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Loading data...</p>
    </div>
  );

  // Empty state message
  const renderEmptyState = (message) => (
    <div className="empty-state">
      <FontAwesomeIcon icon={faClipboardList} className="empty-icon" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="page-wrapper">
      <div className="requirement-container">
        {/* Header Section */}
        <div className="requirement-header">
          <div className="header-title-wrapper">
            <h1 className="requirement-title">
              <span className="project-name">{projectName || projectId}</span>
              <span className="page-type">Requirements</span>
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="req-action-buttons">
            <button className="create-verification-button action-btn" onClick={handleCreateVeri}>
              <FontAwesomeIcon icon={faPlus} className="action-icon" />
              Create Verification
            </button>

            <button className="verifylist-button action-btn" onClick={handleVerilist}>
              <FontAwesomeIcon icon={faClipboardList} className="action-icon" />
              Verification List
            </button>

            <button className="CreateVar-button action-btn" onClick={handleCreateVar}>
              <FontAwesomeIcon icon={faPlus} className="action-icon" />
              Create Validation
            </button>

            <button className="validation-button action-btn" onClick={handleVarilist}>
              <FontAwesomeIcon icon={faClipboardList} className="action-icon" />
              Validation List
            </button>

            <button className="versioncontrol-button action-btn" onClick={handleVerControl}>
              <FontAwesomeIcon icon={faCodeBranch} className="action-icon" />
              Version Control
            </button>

            <button className="baseline-button action-btn" onClick={handleBaseline}>
              <FontAwesomeIcon icon={faHistory} className="action-icon" />
              Baseline
            </button>
          </div>
        </div>
      </div>

      {/* Alert Message */}
      {alertMessage && <div className="alert-message">{alertMessage}</div>}

      {/* Search and Filter Section */}
      <div className="req-search">
        <div className="search-container">
          <input
            type="text"
            className="req-search-input"
            placeholder="Search requirement by ID, name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <img
                src={clearsearch}
                alt="Clear search"
                className="clearsearch-req"
              />
            </button>
          )}
        </div>

        <div className="filters-container">
          <div className="requirement_filterstatus">
            <label className="requirement_filterstatus-label">
              <FontAwesomeIcon icon={faFilter} className="filter-icon" />
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="requirement_filterstatus-select"
            >
              <option value="">All Statuses</option>
              <option value="WORKING">Working</option>
              <option value="VERIFIED">Verified</option>
              <option value="VALIDATED">Validated</option>
              <option value="WAITING FOR VERIFICATION">Waiting for Verification</option>
              <option value="WAITING FOR VALIDATION">Waiting for Validation</option>
              <option value="BASELINE">Baseline</option>
            </select>
          </div>

          <div className="requirement_filtertype">
            <label className="requirement_filtertype-label">
              <FontAwesomeIcon icon={faFilter} className="filter-icon" />
              Type:
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="requirement_filtertype-select"
            >
              <option value="">All Types</option>
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

        <button
          onClick={() => navigate(`/CreateRequirement?project_id=${projectId}`)}
          className="add-requirement-button"
        >
          <FontAwesomeIcon icon={faPlus} className="add-icon" />
          Add Requirement
        </button>
      </div>

      {/* Requirements Table */}
      <div className="content-container">
        {loading ? (
          renderLoading()
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredRequirements.length === 0 ? (
          renderEmptyState("No requirements found. Add some requirements or adjust your filters.")
        ) : (
          <div className="table-responsive">
            <table className="requirement-table">
              <thead>
                <tr>
                  <th className="id-column">ID</th>
                  <th className="name-column">Name</th>
                  <th className="type-column">Type</th>
                  <th className="actions-column">Actions</th>
                  <th className="status-column">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequirements.map((data) => (
                  <tr key={data.requirement_id} className="requirement-row">
                    <td
                      className="req-id-cell"
                      onClick={() =>
                        navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                          state: { requirement: data },
                        })
                      }
                    >
                      {formatRequirementId(data.requirement_id)}
                    </td>
                    <td
                      className="req-name-cell"
                      onClick={() =>
                        navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                          state: { requirement: data },
                        })
                      }
                    >
                      {data.requirement_name}
                    </td>
                    <td
                      className="req-type-cell"
                      onClick={() =>
                        navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                          state: { requirement: data },
                        })
                      }
                    >
                      <span className="type-badge">{data.requirement_type}</span>
                    </td>

                    {/* Actions Buttons */}
                    <td className="req-actions-cell">
                      <div className="action-buttons-group">
                        <button
                          onClick={() =>
                            navigate(`/ViewEditReq?requirement_id=${data.requirement_id}`, {
                              state: { requirement: data },
                            })
                          }
                          className="action-button colored-view-button"
                          title="View Requirement"
                        >
                          <FontAwesomeIcon icon={faEye} className="action-icon" />
                        </button>

                        <button
                          onClick={() =>
                            navigate(
                              `/UpdateRequirement?project_id=${projectId}&requirement_id=${data.requirement_id}`
                            )
                          }
                          className="action-button colored-edit-button"
                          title="Edit Requirement"
                        >
                          <FontAwesomeIcon icon={faPen} className="action-icon" />
                        </button>

                        <button
                          onClick={() => handleDelete(data.requirement_id)}
                          className="action-button colored-delete-button"
                          title="Delete Requirement"
                        >
                          <FontAwesomeIcon icon={faTrash} className="action-icon" />
                        </button>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="req-status-cell">
                      <div
                        className={`status-button 
                          ${data.requirement_status === 'VERIFIED' ? 'status-verified' : ''}
                          ${data.requirement_status === 'VALIDATED' ? 'status-validated' : ''} 
                          ${data.requirement_status === 'WORKING' ? 'status-working' : ''} 
                          ${data.requirement_status === 'WAITING FOR VERIFICATION' ? 'status-waiting-ver' : ''}
                          ${data.requirement_status === 'WAITING FOR VALIDATION' ? 'status-val-inprogress' : ''}
                          ${data.requirement_status === 'BASELINE' ? 'status-baseline' : ''}
                        `}
                      >
                        {data.requirement_status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div className="file-upload-section">
        <div className="upload-section">
          <h3 className="section-title">
            <FontAwesomeIcon icon={faFileUpload} className="section-icon" />
            Uploaded Files
          </h3>
          <button onClick={handleOpenModal} className="upload-req">
            <FontAwesomeIcon icon={faPlus} className="upload-icon" /> 
            Add File
          </button>
        </div>

        <div className="file-upload-container">
          {loading ? (
            renderLoading()
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : files.length === 0 ? (
            renderEmptyState("No files uploaded yet. Upload files using the 'Add File' button.")
          ) : (
            <div className="table-responsive">
              <table className="table-file">
                <thead>
                  <tr>
                    <th className="file-id-column">File ID</th>
                    <th className="file-name-column">File Name</th>
                  
                    <th className="file-actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.filereq_id} className="file-row">
                      <td className="file-id-cell">{file.filereq_id}</td>
                      <td className="file-name-cell">
                        <span className="file-name-text">{file.filereq_name}</span>
                      </td>
                      <td className="file-actions-cell">
                        <div className="file-action-buttons">
                          <button
                            className="view-requirement-button"
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
                            className="download-file-button"
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
                            className="delete-file-button" 
                            title="Delete File"
                            onClick={() => handleDeleteFile(file.filereq_id)}
                          >
                            <FontAwesomeIcon icon={faTrash} className="delete-file" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal for UploadFile */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Upload File Modal"
        className="upload-file-modal"
        overlayClassName="modal-overlay"
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