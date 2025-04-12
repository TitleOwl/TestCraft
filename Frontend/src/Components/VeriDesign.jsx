import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Joyride, { STATUS } from 'react-joyride'; // Use Joyride instead of Swal for tutorials/guidance
import { toast } from "react-toastify";         // Use Toast instead of Swal for notifications
import axios from "axios";
import "./CSS/VeriDesign.css";                  // Main CSS file for this component

// Import FontAwesome Icons (Replacing image imports)
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
    faQuestionCircle,
    faPalette // Using palette for Design
} from "@fortawesome/free-solid-svg-icons";

// --- Modal Component (Refactored with VeriDesign Class Names and Structure) ---
const Modal = ({ show, onClose, designDetails = {}, veridesignBy = [] }) => {
    if (!show) return null;

    // Ensure veridesignBy is an array of objects { name, value }
    const parsedVerificationBy = Array.isArray(veridesignBy) ? veridesignBy : [];

    // Ensure design_ids is always an array for display
    const designIds = Array.isArray(designDetails.design_ids)
        ? designDetails.design_ids
        : typeof designDetails.design_ids === 'string' || typeof designDetails.design_ids === 'number'
          ? [designDetails.design_ids] // Handle single ID
          : []; // Default to empty array if undefined/null

    return (
        // Use VeriDesign specific class names for the modal
        <div className="veridesign-modal-overlay">
            <div className="veridesign-modal-content">
                <div className="veridesign-modal-header">
                    <h3>Design Verification Details</h3>
                    <button className="veridesign-modal-close-button" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>
                <div className="veridesign-modal-body">
                    {/* Section for Design Info */}
                    <div className="veridesign-info-section"> {/* Specific class */}
                        <h4>
                            <FontAwesomeIcon icon={faPalette} className="veridesign-section-icon" /> {/* Specific class */}
                            Design Information
                        </h4>
                        <div className="veridesign-info-list"> {/* Specific class */}
                             <div className="veridesign-info-item"> {/* Specific class */}
                                <FontAwesomeIcon icon={faClipboardCheck} className="veridesign-info-icon" /> {/* Specific class */}
                                <span className="veridesign-info-text"> {/* Specific class */}
                                    {/* Display Design IDs */}
                                    {designIds.length > 0
                                      ? `Design IDs: ${designIds.map(id => `SD-${id.toString().padStart(3, '0')}`).join(', ')}`
                                      : "No Design IDs"}
                                </span>
                            </div>
                             <div className="veridesign-info-item">
                                <FontAwesomeIcon icon={faUser} className="veridesign-info-icon" />
                                <span className="veridesign-info-text">
                                    Created By: {designDetails.created_by || "N/A"}
                                </span>
                             </div>
                            {/* Add more details if needed */}
                        </div>
                    </div>

                    {/* Section for Reviewers */}
                    <div className="veridesign-reviewer-section"> {/* Specific class */}
                        <h4>
                            <FontAwesomeIcon icon={faUsers} className="veridesign-section-icon" />
                            Reviewers
                        </h4>
                        {parsedVerificationBy.length > 0 ? (
                            <div className="veridesign-reviewers-list"> {/* Specific class */}
                                {parsedVerificationBy.map((reviewer, index) => (
                                    <div className="veridesign-reviewer-item" key={index}> {/* Specific class */}
                                        <div className="veridesign-reviewer-avatar"> {/* Specific class */}
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                        <div className="veridesign-reviewer-info"> {/* Specific class */}
                                            <span className="veridesign-reviewer-name">{reviewer.name}</span> {/* Specific class */}
                                            {/* Status text classes remain generic for easier styling */}
                                            <span className={`veridesign-reviewer-status ${reviewer.value ? 'verified' : 'not-verified'}`}>
                                                {reviewer.value ? 'Verified' : 'Not verified'}
                                            </span>
                                        </div>
                                        {/* Use FontAwesome Check/Times instead of images */}
                                        <FontAwesomeIcon
                                            icon={reviewer.value ? faCheckCircle : faTimes}
                                            // Status icon classes remain generic
                                            className={`veridesign-status-icon ${reviewer.value ? 'verified' : 'not-verified'}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="veridesign-empty-message">No verification reviewers found.</div> /* Specific class */
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- VeriDesign Component (Fully Refactored based on initial code + enhancements) ---
const VeriDesign = () => {
    // State Variables (Expanded for new features)
    const [designs, setDesigns] = useState([]); // Raw data from API (grouped by round)
    const [filteredDesigns, setFilteredDesigns] = useState([]); // Data for display after filtering/sorting
    const [selectedDesignDetails, setSelectedDesignDetails] = useState({}); // For modal (replaces selectedDesign)
    const [selectedVeriDesignBy, setSelectedVeriDesignBy] = useState([]); // For modal (replaces assignedReviewers)
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true); // Added loading state
    const [searchTerm, setSearchTerm] = useState(""); // Added search state
    const [sortField, setSortField] = useState("veridesign_round"); // Added sort state
    const [sortDirection, setSortDirection] = useState("asc"); // Added sort direction
    const [isRefreshing, setIsRefreshing] = useState(false); // Added refresh state

    // Routing Hooks
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Tutorial State and Steps ---
    const [runDesignTutorial, setRunDesignTutorial] = useState(false);
    const [designTutorialSteps, setDesignTutorialSteps] = useState([
         {
            target: '.veridesign-table', // Target the table
            content: 'This table shows Design Verification Rounds waiting for your review (Round, Creator, Date, Status).',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '.veridesign-row:first-child .veridesign-view-details-btn', // Target first view button
            content: 'Click the eye icon to see which Designs are included in this round and who the assigned reviewers are.',
            placement: 'bottom',
        },
        {
            target: '.veridesign-row:first-child .veridesign-verify-btn', // Target first verify button
            content: "Click 'Verify' to proceed to the design verification page for this round.",
            placement: 'bottom',
        },
        {
            target: '.veridesign-search', // Target search bar
            content: 'You can search for specific rounds or creators here.',
            placement: 'bottom',
        },
        {
            target: '.veridesign-refresh-btn', // Target refresh button
            content: 'Click here to refresh the list.',
            placement: 'bottom',
        },
    ]);

    // Effect to run tutorial on first visit
    useEffect(() => {
        const tutorialShown = localStorage.getItem('designListTutorialShown'); // Unique key for this tutorial
        if (!tutorialShown) {
            const timer = setTimeout(() => {
                // Ensure data has loaded before starting tutorial
                if (!loading && designs.length > 0) {
                     setRunDesignTutorial(true);
                } else if (!loading && designs.length === 0) {
                    // Optionally show a different message or skip if no data
                     localStorage.setItem('designListTutorialShown', 'true'); // Skip if no data to show
                }
            }, 700); // Adjust delay as needed
            return () => clearTimeout(timer);
        }
    }, [loading, designs.length]); // Depend on loading state and data

    // Function to manually restart tutorial
    const handleRestartDesignTutorial = () => {
        localStorage.removeItem('designListTutorialShown'); // Allow restart
        setRunDesignTutorial(true);
    };

    // --- Data Fetching (Modified from original) ---
    const fetchDesigns = useCallback(() => {
        setLoading(true);       // Set loading true at start
        setIsRefreshing(true);  // Set refreshing true
        axios
            .get(`http://localhost:3001/verilistdesign?project_id=${projectId}`)
            .then((response) => {
                console.log("Fetched Designs:", response.data);

                // Group designs by veridesign_round (Same logic as original but ensure robustness)
                const groupedDesigns = response.data.reduce((acc, design) => {
                    const round = design.veridesign_round;
                    if (!acc[round]) {
                        acc[round] = {
                            ...design, // Copy first encountered design's details for the round
                            veridesign_round: round, // Ensure round number is stored
                            // Ensure design_ids is always an array
                            design_ids: Array.isArray(design.design_ids) ? design.design_ids : [design.design_ids].filter(id => id != null), // Handle potential null/undefined
                            // Ensure veridesign_by is processed correctly into {name, value} format
                            veridesign_by: typeof design.veridesign_by === "object" && design.veridesign_by !== null
                                ? Object.entries(design.veridesign_by).map(([name, value]) => ({
                                    name,
                                    value: value === true, // Ensure boolean
                                  }))
                                : [], // Default to empty array if not object
                            // Provide defaults for potentially missing fields
                            design_status: design.design_status || "UNKNOWN",
                            create_by: design.create_by || "N/A",
                            // Use veridesign_at or fallback to created_at or current date
                            veridesign_at: design.veridesign_at || design.created_at || new Date().toISOString(),
                        };
                    } else {
                        // Add design ID if it's not already included
                        const currentDesignId = Array.isArray(design.design_ids) ? design.design_ids[0] : design.design_ids; // Handle array/single id
                        if (currentDesignId != null && !acc[round].design_ids.includes(currentDesignId)) {
                           acc[round].design_ids.push(currentDesignId);
                        }
                        // Merge reviewers, ensuring deduplication (Improved logic)
                        if (typeof design.veridesign_by === "object" && design.veridesign_by !== null) {
                            const newReviewers = Object.entries(design.veridesign_by).map(([name, value]) => ({ name, value: value === true }));
                            const existingNames = new Set(acc[round].veridesign_by.map(r => r.name));
                            newReviewers.forEach(nr => {
                                if (!existingNames.has(nr.name)) {
                                    acc[round].veridesign_by.push(nr);
                                    existingNames.add(nr.name); // Add to set after pushing
                                } else {
                                     // Optional: Update existing reviewer status if needed (e.g., if API could send conflicting statuses)
                                     const existingReviewer = acc[round].veridesign_by.find(r => r.name === nr.name);
                                     if (existingReviewer && existingReviewer.value !== nr.value) {
                                         // Decide update strategy (e.g., keep 'true' if found)
                                         existingReviewer.value = existingReviewer.value || nr.value;
                                     }
                                }
                            });
                        }
                    }
                    return acc;
                }, {});

                 // Filter for 'WAITING FOR VERIFICATION' status and convert grouped object to array
                const processedDesigns = Object.values(groupedDesigns)
                      .filter(d => d.design_status === "WAITING FOR VERIFICATION");

                console.log("Processed Designs:", processedDesigns);
                setDesigns(processedDesigns); // Set the raw (but processed) data
            })
            .catch((err) => {
                console.error("Error fetching designs:", err);
                toast.error("Error fetching designs.", { autoClose: 3000 }); // Use toast for error
            })
            .finally(() => {
                 setLoading(false);      // Set loading false at end
                 setIsRefreshing(false); // Set refreshing false
            });
    }, [projectId]);

    // Effect to fetch data on mount
    useEffect(() => {
        fetchDesigns();
    }, [fetchDesigns]);

    // --- Filtering and Sorting Effect (New Feature) ---
    useEffect(() => {
        let result = [...designs];

        // Apply search filter (Search by Round number or Creator)
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(
                item =>
                    `round-${item.veridesign_round}`.toLowerCase().includes(lowerSearchTerm) ||
                    (item.create_by && item.create_by.toLowerCase().includes(lowerSearchTerm))
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            let compareA, compareB;

            switch (sortField) {
                case "veridesign_round":
                    compareA = a.veridesign_round;
                    compareB = b.veridesign_round;
                    break;
                case "date": // Sort by the assigned date
                    compareA = new Date(a.veridesign_at);
                    compareB = new Date(b.veridesign_at);
                    break;
                case "creator":
                    compareA = a.create_by;
                    compareB = b.create_by;
                    break;
                default:
                    compareA = a.veridesign_round;
                    compareB = b.veridesign_round;
            }

            // Handle string comparison safely
            if (typeof compareA === 'string' && typeof compareB === 'string') {
                return sortDirection === 'asc'
                    ? compareA.localeCompare(compareB)
                    : compareB.localeCompare(compareA);
            }
            // Handle potentially null/undefined values for non-strings before comparison
            if (compareA == null) return sortDirection === 'asc' ? -1 : 1;
            if (compareB == null) return sortDirection === 'asc' ? 1 : -1;

            // Handle other types (numbers, dates)
            if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
            if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
            return 0; // Equal
        });

        setFilteredDesigns(result); // Set the final data for display
    }, [designs, searchTerm, sortField, sortDirection]);

    // --- Handlers (Updated / New) ---

    // Renamed from handleSearchClick, updated state set
    const handleViewDetails = (design) => {
        setSelectedDesignDetails({ // Pass necessary details for the modal
             design_ids: design.design_ids || [],
             created_by: design.create_by || 'N/A',
             // Add any other details needed in the modal
        });
        setSelectedVeriDesignBy(design.veridesign_by || []); // Pass processed reviewers
        setShowModal(true);
    };

    // Updated to use toast instead of Swal
    const handleVerifyClick = (design) => {
        const loggedInUsername = localStorage.getItem("username");

        if (!loggedInUsername) {
             toast.error("Please log in before verifying designs."); // Use toast
             return;
        }

        // Check if the logged-in user is among the assigned reviewers for this round
        const isAssignedReviewer = Array.isArray(design.veridesign_by) && design.veridesign_by.some(
            (reviewer) => reviewer.name === loggedInUsername
        );

        if (!isAssignedReviewer) {
             toast.warn("You are not assigned to review this design round."); // Use toast
             return;
        }

        // Ensure necessary IDs are present
        if (!projectId || !design?.design_ids || design.design_ids.length === 0 || !design?.veridesign_id) {
            toast.error("Invalid data. Cannot proceed with verification."); // Use toast
            console.error("Missing data for navigation:", { projectId, design });
            return;
        }

        // Prepare design IDs string for the URL
        const designIdString = design.design_ids.join(",");
        const veridesignId = design.veridesign_id; // This is the ID for the verification round itself

         navigate(
            `/DesignVerifed?project_id=${projectId}&design_id=${designIdString}&veridesign_id=${veridesignId}`,
            { state: { selectedDesignIds: design.design_ids } } // Pass state if needed by target page
         );
    };

    // New handler
    const handleBackToDashboard = () => {
        navigate(`/Dashboard?project_id=${projectId}`);
    };

    // New handler
    const handleRefresh = () => {
        // fetchDesigns already handles setting isRefreshing and loading states
        fetchDesigns();
        toast.info("Refreshing design list..."); // Use info toast
    };

    // New handler
    const handleSortChange = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to descending for new field
        }
    };

    // New handler
    const closeModal = () => setShowModal(false);

    // New handler for consistent date formatting
    const formatDate = (dateString) => {
         if (!dateString) return "N/A";
         try {
            // Attempt to create a valid date object
            const date = new Date(dateString);
            // Check if the date object is valid
            if (isNaN(date.getTime())) {
                 console.warn("Invalid Date string received:", dateString);
                 return "Invalid Date";
            }
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString(undefined, options);
         } catch (e) {
             console.error("Error formatting date:", dateString, e);
             return "Invalid Date"; // Return an error string
         }
    };

    // --- Loading State ---
    if (loading) {
        return (
            <div className="veridesign-container">
                <div className="veridesign-loading-state">
                    <div className="veridesign-loading-spinner"></div>
                    <p>Loading design verifications...</p>
                </div>
            </div>
        );
    }

    return (
        // Use VeriDesign specific root container class
        <div className="veridesign-container">
            <Joyride
                steps={designTutorialSteps}
                run={runDesignTutorial}
                continuous
                showProgress
                showSkipButton
                styles={{ options: { zIndex: 10000 } }} // Ensure Joyride appears above other elements
                callback={(data) => {
                    const { status } = data;
                    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
                        setRunDesignTutorial(false);
                        localStorage.setItem('designListTutorialShown', 'true'); // Mark as shown
                    }
                }}
            />

            {/* Header Section (New Structure) */}
            <div className="veridesign-header">
                <button className="veridesign-back-btn" onClick={handleBackToDashboard}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faPalette} className="veridesign-title-icon" />
                    Design Verification List
                </h1>
                 {/* Tutorial Button (New) */}
                 <button
                    onClick={handleRestartDesignTutorial}
                    className="veridesign-tutorial-button veridesign-tutorial-button-corner" // Specific classes
                    title="Show Tutorial"
                    // Style to position it in the corner
                    style={{
                        position: 'absolute', top: '15px', right: '20px', fontSize: '1.6rem',
                        background: 'none', border: 'none', color: '#333', cursor: 'pointer', zIndex: 5
                    }}
                >
                    <FontAwesomeIcon icon={faQuestionCircle} />
                 </button>
            </div>

            {/* Content Section (New Structure) */}
            <div className="veridesign-content">
                <div className="veridesign-panel">
                    <div className="veridesign-panel-header">
                        <h2>
                            <FontAwesomeIcon icon={faListAlt} />
                            Design Verification Rounds
                            {/* Count Badge (New) */}
                            <span className="veridesign-count-badge">{filteredDesigns.length}</span>
                        </h2>

                        {/* Tools Section (New) */}
                        <div className="veridesign-tools">
                            {/* Search Input (New) */}
                            <div className="veridesign-search">
                                <FontAwesomeIcon icon={faSearch} className="veridesign-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by Round or creator..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="veridesign-search-input"
                                />
                                {searchTerm && (
                                    <button
                                        className="veridesign-clear-search"
                                        onClick={() => setSearchTerm("")}
                                        title="Clear search"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </div>

                            {/* Refresh Button (New) */}
                            <button
                                className={`veridesign-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <FontAwesomeIcon icon={faSync} spin={isRefreshing} />
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {/* Table Container (New Structure) */}
                    <div className="veridesign-table-container">
                        {filteredDesigns.length === 0 ? (
                            // Empty State (New)
                            <div className="veridesign-empty-state">
                                <FontAwesomeIcon icon={faPalette} className="empty-icon" />
                                <p>No design verifications waiting or match your criteria.</p>
                                <p className="veridesign-empty-subtitle">Try adjusting your search or wait for new assignments.</p>
                            </div>
                        ) : (
                            // Table (Updated Structure and Icons)
                            <table className="veridesign-table">
                                <thead>
                                    <tr>
                                        {/* Add onClick for sorting */}
                                        <th onClick={() => handleSortChange('veridesign_round')}>
                                            Round
                                            {/* Sort Indicator */}
                                            {sortField === 'veridesign_round' && (
                                                <FontAwesomeIcon className="veridesign-sort-icon" icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />
                                            )}
                                        </th>
                                        <th onClick={() => handleSortChange('creator')}>
                                            Created By
                                            {sortField === 'creator' && (
                                                <FontAwesomeIcon className="veridesign-sort-icon" icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />
                                            )}
                                        </th>
                                        <th onClick={() => handleSortChange('date')}>
                                            Date Assigned
                                            {sortField === 'date' && (
                                                <FontAwesomeIcon className="veridesign-sort-icon" icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} />
                                            )}
                                        </th>
                                        <th>Status</th> {/* Status is filtered, so no sorting needed here */}
                                        <th>Reviewer</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over filteredDesigns instead of designs */}
                                    {filteredDesigns.map((design) => (
                                        <tr key={design.veridesign_round} className="veridesign-row">
                                            {/* Use specific cell classes */}
                                            <td className="veridesign-round-cell">
                                            VERIF-{design.veridesign_round}
                                            </td>
                                            <td className="veridesign-creator-cell">
                                                {/* Use consistent structure with icon */}
                                                <div className="veridesign-creator-info">
                                                    <FontAwesomeIcon icon={faUser} className="veridesign-cell-icon" />
                                                    <span>{design.create_by}</span>
                                                </div>
                                            </td>
                                            <td className="veridesign-date-cell">
                                                 {/* Use consistent structure with icon and formatDate */}
                                                <div className="veridesign-date-info">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="veridesign-cell-icon" />
                                                    <span>{formatDate(design.veridesign_at)}</span>
                                                </div>
                                            </td>
                                            <td className="veridesign-status-cell">
                                                {/* Use consistent status span */}
                                                <span className="veridesign-status status-waiting">
                                                    {/* Display the actual status, but it's filtered */}
                                                    {design.design_status.replace(/_/g, ' ')}
                                                </span>
                                            </td>

                                            <td className="veridesign-reviewer-cell">
                                                {/* Use consistent status span */}
                                                <span className="veridesign-view-details-btn">
                                                <button
                                                        className="veridesign-view-details-btn"
                                                        title="View Details & Reviewers"
                                                        onClick={() => handleViewDetails(design)} // Use updated handler
                                                    >
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </button>
                                                </span>
                                            </td>
                                            <td className="veridesign-actions-cell">
                                                    {/* Verify Button with Icon */}
                                                    <button
                                                        className="veridesign-verify-btn"
                                                        onClick={() => handleVerifyClick(design)} // Use updated handler
                                                    >
                                                        <FontAwesomeIcon icon={faCheck} className="veridesign-button-icon" />
                                                        Verify
                                                    </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal (Using Updated Component) */}
            <Modal
                show={showModal}
                onClose={closeModal}
                designDetails={selectedDesignDetails} // Pass updated state
                veridesignBy={selectedVeriDesignBy}   // Pass updated state
            />
        </div>
    );
};

export default VeriDesign;