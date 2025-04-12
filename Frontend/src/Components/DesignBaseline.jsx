import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/DesignBaseline.css"; // <<< เปลี่ยนชื่อไฟล์ CSS ถ้าต้องการ

// --- Icons (Copied and adapted from Baseline) ---
const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="19" y1="12" x2="5" y2="12"></line> <polyline points="12 19 5 12 12 5"></polyline> </svg> );
const DesignBaselineIcon = () => ( /* Using BaselineIcon graphic for now */ <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="6" y1="3" x2="6" y2="15"></line> <circle cx="18" cy="6" r="3"></circle> <circle cx="6" cy="18" r="3"></circle> <path d="M18 9a9 9 0 0 1-9 9"></path> </svg> );
const AddIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="12" y1="5" x2="12" y2="19"></line> <line x1="5" y1="12" x2="19" y2="12"></line> </svg> );
const ViewIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path> <circle cx="12" cy="12" r="3"></circle> </svg> );
const CalendarIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect> <line x1="16" y1="2" x2="16" y2="6"></line> <line x1="8" y1="2" x2="8" y2="6"></line> <line x1="3" y1="10" x2="21" y2="10"></line> </svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="18" y1="6" x2="6" y2="18"></line> <line x1="6" y1="6" x2="18" y2="18"></line> </svg> );
const RefreshIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path></svg>);
// Using RequirementIcon for Design Item in Modal
const DesignItemIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path> <polyline points="14 2 14 8 20 8"></polyline> <line x1="16" y1="13" x2="8" y2="13"></line> <line x1="16" y1="17" x2="8" y2="17"></line> <polyline points="10 9 9 9 8 9"></polyline> </svg> );
const SortIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5M7 9l5-5 5 5"></path></svg>);
// --- End Icons ---

// --- Loading Component ---
const DesignLoadingState = () => (
  <div className="design-baseline-loading-state">
    <div className="design-baseline-loading-spinner"></div>
    <p>Loading design baselines...</p>
  </div>
);

// --- Empty Component ---
const DesignEmptyState = () => (
  <div className="design-baseline-empty-state">
    <div className="design-baseline-empty-icon">📊</div> {/* Use a relevant icon */}
    <h3>No Design Baselines Found</h3>
    <p>Create your first design baseline by clicking the 'Set Baseline' button.</p>
  </div>
);

// --- Error Component ---
const DesignErrorState = ({ message }) => (
    <div className="design-baseline-error-state">
        <div className="design-baseline-error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{message || "An unexpected error occurred."}</p>
    </div>
);


const DesignBaseline = () => {
  const [designBaselines, setDesignBaselines] = useState([]); // Raw data
  const [groupedBaselines, setGroupedBaselines] = useState(new Map());
  const [selectedDesigns, setSelectedDesigns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Default sort by round ascending
  const [sortConfig, setSortConfig] = useState({ key: 'round', direction: 'asc' });

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");

  // --- Sorting ---
  const handleSort = (key) => {
    setSortConfig(prevSortConfig => ({
      key,
      direction: prevSortConfig.key === key && prevSortConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? 'asc' : 'desc';
  };

  // --- Data Fetching ---
  const fetchBaselines = useCallback(() => {
    setLoading(true);
    setError(null);
    axios
      .get(`http://localhost:3001/designbaseline?project_id=${projectId}`)
      .then((response) => {
        // Ensure response data is an array
        const data = Array.isArray(response.data) ? response.data : [];
        setDesignBaselines(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching design baseline:", err);
        const errorMsg = err.response?.data?.message || "Failed to load design baselines. Please try again.";
        setError(errorMsg);
        setLoading(false);
        toast.error("Error fetching design baselines.");
      });
  }, [projectId]);

  useEffect(() => {
    fetchBaselines();
  }, [fetchBaselines]);

  // --- Grouping Data ---
  useEffect(() => {
    const grouped = new Map();
    designBaselines.forEach((baseline) => {
      const key = baseline.baselinedesign_round; // Use round as key
      if (!grouped.has(key)) {
        grouped.set(key, {
          round: key,
          // Take the date from the first entry of this round
          date: baseline.baselinedesign_at,
          designs: [], // Array to hold design IDs for this round
          // Store the raw date for sorting if needed later
          rawDate: new Date(baseline.baselinedesign_at)
        });
      }
      // Add design_id if it exists in the baseline entry
      if (baseline.design_id != null) {
           // Avoid duplicates if the API returns multiple rows for the same design in a round
           if (!grouped.get(key).designs.includes(baseline.design_id)) {
              grouped.get(key).designs.push(baseline.design_id);
           }
      }
    });
    setGroupedBaselines(grouped);
  }, [designBaselines]);

  // --- Sort Grouped Data ---
  const sortedGroupedBaselines = useMemo(() => {
    const sortableItems = Array.from(groupedBaselines.values());
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'date') {
            // Use the stored raw Date object for accurate comparison
            aValue = a.rawDate;
            bValue = b.rawDate;
        } else { // Assume sorting by round (numeric)
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [groupedBaselines, sortConfig]);


  // --- Utility Functions ---
   const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const date = new Date(dateString);
        // Example: "April 12, 2025"
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return "Invalid Date";
    }
  };


  // --- Event Handlers ---
  const handleSetBaselineClick = () => {
    navigate(`/CreateDesignbaseline?project_id=${projectId}`);
  };

  const handleViewDesign = (designs) => {
     // Ensure designs is always an array
    setSelectedDesigns(Array.isArray(designs) ? designs : []);
    setIsModalOpen(true);
  };

  const handleBack = () => {
    // Navigate back to the main Dashboard Design section
    navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: 'Design' } });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDesigns([]); // Clear selection on close
  };

  const handleRefresh = () => {
    fetchBaselines(); // Re-fetch data
  };


  // --- Render Logic ---
  return (
    // Use specific class names for Design Baseline
    <div className="design-baseline-dashboard">
      <div className="design-baseline-header">
        <div className="design-baseline-header-left">
          <button className="design-baseline-back-button" onClick={handleBack}>
            <BackIcon />
            <span>Back</span>
          </button>
        </div>
        <div className="design-baseline-header-title">
          <DesignBaselineIcon />
          <h1>Design Baseline Management</h1>
        </div>
        <div className="design-baseline-header-right">
          <button className="design-baseline-refresh-button" onClick={handleRefresh}>
            <RefreshIcon />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="design-baseline-controls">
        <button className="design-baseline-create-button" onClick={handleSetBaselineClick}>
          <AddIcon />
          <span>Set New Design Baseline</span>
        </button>
      </div>

      <div className="design-baseline-content">
        {loading ? (
          <DesignLoadingState />
        ) : error ? (
          <DesignErrorState message={error} />
        ) : groupedBaselines.size === 0 ? ( // Check grouped size after loading
          <DesignEmptyState />
        ) : (
          <div className="design-baseline-table-container">
            <table className="design-baseline-table">
              <thead>
                <tr>
                  <th
                    className={`col-baseline ${getSortIndicator('round')}`}
                    onClick={() => handleSort('round')}
                  >
                    <span>Design Baseline (Round)</span>
                    <SortIcon />
                  </th>
                  <th
                    className={`col-date ${getSortIndicator('date')}`}
                    onClick={() => handleSort('date')}
                  >
                    <span>Date Created</span>
                    <SortIcon />
                  </th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Map over the sorted grouped baselines */}
                {sortedGroupedBaselines.map((baselineGroup) => (
                  <tr key={baselineGroup.round} className="design-baseline-row">
                    <td className="col-baseline">
                      {/* Format the baseline round */}
                      <span className="design-baseline-id">BL-{String(baselineGroup.round).padStart(3, '0')}</span>
                    </td>
                    <td className="col-date">
                      <div className="date-info">
                        <CalendarIcon />
                        <span>{formatDate(baselineGroup.date)}</span>
                      </div>
                    </td>
                    <td className="col-actions">
                      <button
                        className="view-designs-button" // Specific class
                        onClick={() => handleViewDesign(baselineGroup.designs)}
                        disabled={!baselineGroup.designs || baselineGroup.designs.length === 0} // Disable if no designs
                      >
                        <ViewIcon />
                        <span>View Designs ({baselineGroup.designs?.length || 0})</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Requirements Modal - Adapted for Designs */}
      {isModalOpen && (
        <div className="design-baseline-modal-overlay" onClick={closeModal}>
          <div className="design-baseline-modal-content" onClick={e => e.stopPropagation()}>
            <div className="design-baseline-modal-header">
              <h2>Designs in this Baseline</h2>
              <button className="design-baseline-modal-close" onClick={closeModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="design-baseline-modal-body">
              {selectedDesigns.length === 0 ? (
                <div className="design-baseline-empty-designs"> {/* Specific class */}
                  <div className="design-baseline-empty-icon">📄</div> {/* Different icon? */}
                  <p>No designs associated with this baseline entry.</p>
                </div>
              ) : (
                <ul className="design-baseline-designs-list"> {/* Specific class */}
                  {selectedDesigns.map((designId, index) => (
                    <li key={index} className="design-baseline-design-item"> {/* Specific class */}
                      <DesignItemIcon />
                      {/* Format Design ID */}
                      <span>SD-{String(designId).padStart(3, '0')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="design-baseline-modal-footer">
              <button className="design-baseline-modal-button" onClick={closeModal}>
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

export default DesignBaseline;