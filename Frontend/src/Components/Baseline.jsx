import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/Baseline.css";

// Icons
const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const BaselineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15"></line>
    <circle cx="18" cy="6" r="3"></circle>
    <circle cx="6" cy="18" r="3"></circle>
    <path d="M18 9a9 9 0 0 1-9 9"></path>
  </svg>
);

const AddIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
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

const RequirementIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

// Loading Component
const LoadingState = () => (
  <div className="baseline-loading-state">
    <div className="baseline-loading-spinner"></div>
    <p>Loading baselines...</p>
  </div>
);

// Empty Component
const EmptyState = () => (
  <div className="baseline-empty-state">
    <div className="baseline-empty-icon">📊</div>
    <h3>No Baselines Found</h3>
    <p>Create your first baseline by clicking the 'Set Baseline' button.</p>
  </div>
);

const Baseline = () => {
  const [baselines, setBaselines] = useState([]);
  const [selectedRequirements, setSelectedRequirements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'baseline_round', direction: 'asc' });
  
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  // Handle sorting
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

  // Fetch baselines data
  const fetchBaselines = useCallback(() => {
    setLoading(true);
    setError(null);
    
    axios
      .get(`http://localhost:3001/baselines?project_id=${projectId}`)
      .then((response) => {
        const baselinesData = response.data.map((baseline) => ({
          ...baseline,
          requirements: baseline.requirements || [],
        }));
        setBaselines(baselinesData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching baselines:", err);
        setError("Failed to load baselines. Please try again.");
        setLoading(false);
        toast.error("Error fetching baselines.");
      });
  }, [projectId]);

  useEffect(() => {
    fetchBaselines();
  }, [fetchBaselines]);

  // Sort baselines based on config
  const sortedBaselines = React.useMemo(() => {
    const sortableItems = [...baselines];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [baselines, sortConfig]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Handle navigation to Create Baseline
  const handleSetBaselineClick = () => {
    navigate(`/CreateBaseline?project_id=${projectId}`);
  };

  // Open modal to show requirements
  const handleViewRequirements = (requirements) => {
    setSelectedRequirements(requirements);
    setIsModalOpen(true);
  };

  // Navigate back to Dashboards
  const handleBack = () => {
    navigate(`/Dashboard?project_id=${projectId}`);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequirements([]);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchBaselines();
  };

  return (
    <div className="baseline-dashboard">
      <div className="baseline-header">
        <div className="baseline-header-left">
          <button className="baseline-back-button" onClick={handleBack}>
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="baseline-header-title">
          <BaselineIcon />
          <h1>Baseline Management</h1>
        </div>
        <div className="baseline-header-right">
          <button className="baseline-refresh-button" onClick={handleRefresh}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="baseline-controls">
        <button className="baseline-create-button" onClick={handleSetBaselineClick}>
          <AddIcon />
          <span>Set New Baseline</span>
        </button>
      </div>

      <div className="baseline-content">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="baseline-error-state">
            <div className="baseline-error-icon">⚠️</div>
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : baselines.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="baseline-table-container">
            <table className="baseline-table">
              <thead>
                <tr>
                  <th 
                    className={`col-baseline ${getSortIndicator('baseline_round')}`}
                    onClick={() => handleSort('baseline_round')}
                  >
                    <span>Baseline</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                  </th>
                  <th 
                    className={`col-date ${getSortIndicator('baseline_at')}`}
                    onClick={() => handleSort('baseline_at')}
                  >
                    <span>Date Created</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"></path>
                    </svg>
                  </th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBaselines.map((baseline) => (
                  <tr key={baseline.id} className="baseline-row">
                    <td className="col-baseline">
                      <span className="baseline-id">BL-{String(baseline.baseline_round).padStart(3, '0')}</span>
                    </td>
                    <td className="col-date">
                      <div className="date-info">
                        <CalendarIcon />
                        <span>{formatDate(baseline.baseline_at)}</span>
                      </div>
                    </td>
                    <td className="col-actions">
                      <button
                        className="view-requirements-button"
                        onClick={() => handleViewRequirements(baseline.requirements)}
                      >
                        <ViewIcon />
                        <span>View Requirements</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Requirements Modal */}
      {isModalOpen && (
        <div className="baseline-modal-overlay" onClick={closeModal}>
          <div className="baseline-modal-content" onClick={e => e.stopPropagation()}>
            <div className="baseline-modal-header">
              <h2>Baseline Requirements</h2>
              <button className="baseline-modal-close" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="baseline-modal-body">
              {selectedRequirements.length === 0 ? (
                <div className="baseline-empty-requirements">
                  <div className="baseline-empty-icon">📋</div>
                  <p>No requirements in this baseline.</p>
                </div>
              ) : (
                <ul className="baseline-requirements-list">
                  {selectedRequirements.map((requirement, index) => (
                    <li key={index} className="baseline-requirement-item">
                      <RequirementIcon />
                      <span>REQ-{String(requirement).padStart(3, '0')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="baseline-modal-footer">
              <button className="baseline-modal-button" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

export default Baseline;
