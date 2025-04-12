import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify"; // Use Toastify
import { useLocation, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/CreateDesignbaseline.css";

// --- Icons (Copied from CreateBaseline) ---
const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="19" y1="12" x2="5" y2="12"></line> <polyline points="12 19 5 12 12 5"></polyline> </svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <polyline points="20 6 9 17 4 12"></polyline> </svg> );
const CancelIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="18" y1="6" x2="6" y2="18"></line> <line x1="6" y1="6" x2="18" y2="18"></line> </svg> );
// Using BaselineIcon graphic for consistency
const DesignBaselineIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="6" y1="3" x2="6" y2="15"></line> <circle cx="18" cy="6" r="3"></circle> <circle cx="6" cy="18" r="3"></circle> <path d="M18 9a9 9 0 0 1-9 9"></path> </svg> );
const ListIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"> <line x1="8" y1="6" x2="21" y2="6"></line> <line x1="8" y1="12" x2="21" y2="12"></line> <line x1="8" y1="18" x2="21" y2="18"></line> <line x1="3" y1="6" x2="3.01" y2="6"></line> <line x1="3" y1="12" x2="3.01" y2="12"></line> <line x1="3" y1="18" x2="3.01" y2="18"></line> </svg> );
// --- End Icons ---


// --- Custom Status Badge Component for Design ---
const DesignStatusBadge = ({ status }) => {
    let statusClass = "";
    // Adapt based on actual design statuses used
    switch (status?.toUpperCase()) {
        case "VERIFIED": statusClass = "verified"; break;
        case "BASELINE": statusClass = "baseline"; break;
        // Add other statuses like WORKING, etc. if needed
        default: statusClass = "default";
    }
    // Use specific prefix for class names
    return <span className={`create-design-baseline-status-badge ${statusClass}`}>{status || 'N/A'}</span>;
};

// --- Loading Component ---
const CreateDesignBaselineLoadingState = () => (
    <div className="create-design-baseline-loading-state"> {/* Prefix added */}
        <div className="create-design-baseline-loading-spinner"></div> {/* Prefix added */}
        <p>Loading verified designs...</p> {/* Text adapted */}
    </div>
);

// --- Error Component ---
const CreateDesignBaselineErrorState = ({ message }) => (
    <div className="create-design-baseline-error-state"> {/* Prefix added */}
        <div className="create-design-baseline-error-icon">⚠️</div> {/* Prefix added */}
        <h3>Error</h3>
        <p>{message}</p>
    </div>
);

// --- Empty State Component ---
const CreateDesignBaselineEmptyState = () => (
    <div className="create-design-baseline-empty-state"> {/* Prefix added */}
        <div className="create-design-baseline-empty-icon">📄</div> {/* Changed Icon, Prefix added */}
        <h3>No Verified Designs</h3> {/* Text adapted */}
        <p>There are no verified designs available to set as baseline.</p> {/* Text adapted */}
    </div>
);


const CreateDesignbaseline = () => {
    // Renamed state for clarity and consistency
    const [verifiedDesigns, setVerifiedDesigns] = useState([]);
    const [selectedDesigns, setSelectedDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectAll, setSelectAll] = useState(false); // Added selectAll state

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const navigate = useNavigate();

    // --- Handle "Select All" checkbox ---
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedDesigns([]);
        } else {
            // Select only designs that are not already baseline
            const allVerifiedIds = verifiedDesigns
                .filter(design => design.design_status !== "BASELINE") // Ensure we only select non-baseline ones
                .map(design => design.design_id);
            setSelectedDesigns(allVerifiedIds);
        }
        setSelectAll(!selectAll);
    };

    // --- Check if all selectable requirements are selected ---
    useEffect(() => {
        const selectableDesigns = verifiedDesigns.filter(d => d.design_status !== "BASELINE");
        if (selectableDesigns.length > 0) {
            setSelectAll(selectedDesigns.length === selectableDesigns.length);
        } else {
            setSelectAll(false); // No selectable items, so cannot be "all selected"
        }
    }, [selectedDesigns, verifiedDesigns]);


    // --- Fetch verified designs ---
    useEffect(() => {
        const fetchDesigns = async () => { // Renamed function
            if (!projectId) return;

            setLoading(true);
            setError(null);

            try {
                // Assuming this endpoint correctly returns ONLY verified designs OR designs suitable for baseline
                const response = await axios.get(
                    `http://localhost:3001/designverified/${projectId}` // Use the correct endpoint
                );
                // Ensure response data is an array
                const designsData = Array.isArray(response.data) ? response.data : [];
                setVerifiedDesigns(designsData);

            } catch (err) { // Catch specific error
                console.error("Error fetching verified designs:", err); // Log error
                setError("Failed to load verified designs. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchDesigns();
    }, [projectId]);


    // --- Handle individual selection ---
    const handleSelect = (id) => {
        // Prevent selection if the design is already BASELINE
        const design = verifiedDesigns.find(d => d.design_id === id);
        if (design?.design_status === "BASELINE") {
            toast.info("This design is already part of a baseline.");
            return;
        }

        setSelectedDesigns((prev) =>
            prev.includes(id)
                ? prev.filter((itemId) => itemId !== id)
                : [...prev, id]
        );
    };

    // --- Handle Create Baseline ---
    const handleCreateBaseline = async () => {
        // --- Validation ---
        if (!projectId) {
            toast.error("Invalid project ID.");
            return;
        }
        if (selectedDesigns.length === 0) {
            toast.warning("Please select at least one design.");
            return;
        }
        if (isSubmitting) {
            toast.info("Submitting in progress. Please wait.");
            return;
        }
        // --- End Validation ---

        setIsSubmitting(true);

        const payloadCreateBaseline = { design_id: selectedDesigns };

        try {
            // 1. Create/Update Baseline entry
            const responseCreateBaseline = await axios.post("http://localhost:3001/createdesignbaseline", payloadCreateBaseline);

            if (responseCreateBaseline.status === 201) {
                toast.success("Baseline set successfully!");

                // 2. Add History entries (using the logic from your original component)
                const historyPromises = selectedDesigns.map((designId) => {
                    const fullDesignData = verifiedDesigns.find(design => design.design_id === designId);
                    if (!fullDesignData) {
                        console.error(`Could not find full data for design_id: ${designId}.`);
                        return Promise.resolve({ status: 'skipped', designId, reason: 'Data not found' }); // Resolve instead of reject for Promise.allSettled
                    }

                    let { design_id, requirement_id, design_type, diagram_name, diagram_type, design_description } = fullDesignData;
                    const design_status = "BASELINE"; // Always BASELINE for this history entry

                    // Ensure requirement_id is processed correctly (handle string JSON, array, single number, null)
                    let processedReqIds = [];
                    try {
                       if (requirement_id) {
                           let parsedIds;
                           if (typeof requirement_id === 'string') {
                               parsedIds = JSON.parse(requirement_id);
                           } else {
                               parsedIds = requirement_id; // Assume it's already array/object/number
                           }

                           if (Array.isArray(parsedIds)) {
                               processedReqIds = parsedIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                           } else if (typeof parsedIds === 'object' && parsedIds !== null) {
                                // Handle case where it might be an object like {0: "1", 1: "2"}
                                processedReqIds = Object.values(parsedIds).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                           } else if (typeof parsedIds === 'number' && !isNaN(parsedIds)) {
                               processedReqIds = [parsedIds];
                           } else {
                               console.warn(`[History] Unexpected format for requirement_id for designId: ${designId}:`, requirement_id);
                           }
                       }
                    } catch (error) {
                         console.error(`[History] Error processing requirement_id for designId: ${designId}:`, error);
                    }

                    console.log(`[History] Processed requirement_ids for designId: ${designId}:`, processedReqIds);

                    // Create a history entry for each associated requirement_id
                    const reqHistoryPromises = processedReqIds.map(reqId => {
                         const historyPayload = {
                              design_id: design_id?.toString() || '',
                              requirement_id: reqId, // Use the processed ID
                              design_type: design_type || '',
                              diagram_name: diagram_name || '',
                              diagram_type: diagram_type || '',
                              design_description: design_description || '',
                              design_status // BASELINE
                          };
                          console.log(`[History] Sending payload for designId: ${designId}, requirement_id: ${reqId}:`, historyPayload);
                          return axios.post("http://localhost:3001/addHistoryDesign", historyPayload)
                              .then(response => ({ status: 'fulfilled', designId, reqId, response }))
                              .catch(error => {
                                   const errorMessage = `[History] Error adding history for designId: ${designId}, requirement_id: ${reqId}: ${error.response?.data?.message || error.message}`;
                                   console.error(errorMessage, error.response || error);
                                   // Still resolve so Promise.allSettled works
                                   return Promise.resolve({ status: 'rejected', designId, reqId, error: errorMessage });
                              });
                    });

                    // If there are no processedReqIds, create one history entry without requirement_id or skip
                     if (processedReqIds.length === 0) {
                        console.warn(`[History] No valid requirement_id found for designId: ${designId}. Creating history entry without requirement_id.`);
                         const historyPayload = {
                             design_id: design_id?.toString() || '',
                             requirement_id: null, // Explicitly set to null or omit
                             design_type: design_type || '',
                             diagram_name: diagram_name || '',
                             diagram_type: diagram_type || '',
                             design_description: design_description || '',
                             design_status // BASELINE
                         };
                         console.log(`[History] Sending payload for designId: ${designId} (no req_id):`, historyPayload);
                         return axios.post("http://localhost:3001/addHistoryDesign", historyPayload)
                             .then(response => ({ status: 'fulfilled', designId, reqId: null, response }))
                             .catch(error => {
                                 const errorMessage = `[History] Error adding history for designId: ${designId} (no req_id): ${error.response?.data?.message || error.message}`;
                                 console.error(errorMessage, error.response || error);
                                 return Promise.resolve({ status: 'rejected', designId, reqId: null, error: errorMessage });
                             });
                    }


                    // Use Promise.allSettled to ensure all history attempts complete
                    return Promise.allSettled(reqHistoryPromises);
                });

                // Wait for all history additions to settle
                const historyResults = await Promise.allSettled(historyPromises);
                console.log("History addition results:", historyResults);
                // Check if any history additions failed and potentially notify user
                 const failedHistory = historyResults.filter(result => result.status === 'rejected' || (result.value && result.value.some?.(v => v.value?.status === 'rejected')));
                 if (failedHistory.length > 0) {
                     console.error("Some history entries failed to be added:", failedHistory);
                     toast.warning("Baseline set, but some history entries failed to record.");
                 } else {
                     toast.info("Design history updated."); // Separate success message for history
                 }


                // 3. Update Frontend State (Filter out processed designs)
                 setVerifiedDesigns((prev) =>
                     prev.filter((design) => !selectedDesigns.includes(design.design_id))
                 );
                 setSelectedDesigns([]); // Clear selection

                // 4. Navigate back to Design Baseline list
                navigate(`/DesignBaseline?project_id=${projectId}`);

            } else {
                // Handle non-201 status from baseline creation
                throw new Error(responseCreateBaseline.data.message || "Failed to set baseline.");
            }
        } catch (error) {
            console.error("Error creating baseline or adding history:", error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || "An error occurred. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Handle Cancel ---
    const handleCancel = () => {
        navigate(`/DesignBaseline?project_id=${projectId}`); // Navigate back to Design Baseline list
    };

    // --- Format Design ID ---
    const formatDesignId = (id) => {
        if (id == null) return 'SD-N/A';
        const idNum = Number(id);
        if (isNaN(idNum)) return 'SD-Invalid';
        return `SD-${idNum.toString().padStart(3, '0')}`;
    };


    // --- Render Logic ---
    return (
        // Use specific prefixed class names
        <div className="create-design-baseline-dashboard">
            <div className="create-design-baseline-header">
                <div className="create-design-baseline-header-left">
                    <button className="create-design-baseline-back-button" onClick={handleCancel}>
                        <BackIcon />
                        <span>Back</span>
                    </button>
                </div>
                <div className="create-design-baseline-header-title">
                    <DesignBaselineIcon />
                    <h1>Create New Design Baseline</h1>
                </div>
                <div className="create-design-baseline-header-right"></div> {/* Keep for alignment */}
            </div>

            <div className="create-design-baseline-content">
                {loading ? (
                    <CreateDesignBaselineLoadingState />
                ) : error ? (
                    <CreateDesignBaselineErrorState message={error} />
                ) : verifiedDesigns.length === 0 ? (
                    <CreateDesignBaselineEmptyState />
                ) : (
                    // Card structure similar to CreateBaseline
                    <div className="create-design-baseline-card">
                        <div className="create-design-baseline-card-header">
                            <div className="create-design-baseline-title-section">
                                <ListIcon />
                                <h2>Verified Designs</h2> {/* Adapted Title */}
                            </div>
                            <div className="create-design-baseline-selection-info">
                                {/* Filter out already baseline designs from total count */}
                                <span>{selectedDesigns.length} of {verifiedDesigns.filter(d=>d.design_status !== 'BASELINE').length} selected</span>
                            </div>
                        </div>

                        <div className="create-design-baseline-table-container">
                            <table className="create-design-baseline-table">
                                <thead>
                                    <tr>
                                        <th className="col-checkbox">
                                            <div className="checkbox-container">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    id="select-all-designs" // Unique ID
                                                    className="styled-checkbox"
                                                    // Disable if no selectable designs
                                                     disabled={verifiedDesigns.filter(d=>d.design_status !== 'BASELINE').length === 0}
                                                />
                                                <label htmlFor="select-all-designs"></label>
                                            </div>
                                        </th>
                                        <th className="col-id">ID</th>
                                        <th className="col-name">Name</th>
                                        <th className="col-type">Type</th>
                                        <th className="col-status">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Map over designs */}
                                    {verifiedDesigns.map((design) => (
                                        <tr
                                            key={design.design_id}
                                            // Add selected class, make row clickable only if not baseline
                                            className={`create-design-baseline-row ${selectedDesigns.includes(design.design_id) ? 'selected' : ''} ${design.design_status === 'BASELINE' ? 'is-baseline' : ''}`}
                                            onClick={design.design_status !== 'BASELINE' ? () => handleSelect(design.design_id) : undefined}
                                            style={design.design_status === 'BASELINE' ? { cursor: 'not-allowed', opacity: 0.6 } : {cursor: 'pointer'}} // Visual cue for non-clickable
                                        >
                                            <td className="col-checkbox">
                                                <div className="checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDesigns.includes(design.design_id)}
                                                        // Disable checkbox if already baseline
                                                        disabled={design.design_status === 'BASELINE'}
                                                        onChange={() => handleSelect(design.design_id)} // onChange still needed
                                                        id={`design-${design.design_id}`} // Unique ID
                                                        className="styled-checkbox"
                                                    />
                                                    <label htmlFor={`design-${design.design_id}`}></label>
                                                </div>
                                            </td>
                                            <td className="col-id">
                                                {/* Format ID */}
                                                <span className="design-id">{formatDesignId(design.design_id)}</span>
                                            </td>
                                            {/* Display design details */}
                                            <td className="col-name">{design.diagram_name || 'N/A'}</td>
                                            <td className="col-type">{design.diagram_type || 'N/A'}</td>
                                            <td className="col-status">
                                                {/* Use DesignStatusBadge */}
                                                <DesignStatusBadge status={design.design_status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Action Buttons */}
                        <div className="create-design-baseline-actions">
                            <button
                                className="create-design-baseline-cancel-button"
                                onClick={handleCancel}
                            >
                                <CancelIcon />
                                <span>Cancel</span>
                            </button>
                            <button
                                className="create-design-baseline-submit-button"
                                onClick={handleCreateBaseline}
                                disabled={isSubmitting || selectedDesigns.length === 0}
                            >
                                <CheckIcon />
                                <span>{isSubmitting ? "Creating..." : "Set Design Baseline"}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Container for notifications */}
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

export default CreateDesignbaseline;