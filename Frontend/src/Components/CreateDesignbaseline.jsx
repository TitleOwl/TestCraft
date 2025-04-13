import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify"; // Use Toastify
import { useLocation, useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
// Corrected path assuming CSS is one level up in a 'CSS' folder
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
    // Adapt based on actual design status used
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
    <div className="create-design-baseline-loading-state">
        <div className="create-design-baseline-loading-spinner"></div>
        <p>Loading verified designs...</p>
    </div>
);

// --- Error Component ---
const CreateDesignBaselineErrorState = ({ message }) => (
    <div className="create-design-baseline-error-state">
        <div className="create-design-baseline-error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{message}</p>
    </div>
);

// --- Empty State Component ---
const CreateDesignBaselineEmptyState = () => (
    <div className="create-design-baseline-empty-state">
        <div className="create-design-baseline-empty-icon">📄</div>
        <h3>No Verified Designs</h3>
        <p>There are no verified designs available to set as baseline.</p>
    </div>
);


const CreateDesignbaseline = () => {
    const [verifiedDesigns, setVerifiedDesigns] = useState([]);
    const [selectedDesigns, setSelectedDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectAll, setSelectAll] = useState(false);

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const navigate = useNavigate();

    // --- Handle "Select All" checkbox ---
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedDesigns([]);
        } else {
            const allVerifiedIds = verifiedDesigns
                .filter(design => design.design_status !== "BASELINE")
                .map(design => design.design_id);
            setSelectedDesigns(allVerifiedIds);
        }
        setSelectAll(!selectAll);
    };

    // --- Check if all selectable designs are selected ---
    useEffect(() => {
        const selectableDesigns = verifiedDesigns.filter(d => d.design_status !== "BASELINE");
        if (selectableDesigns.length > 0) {
            setSelectAll(selectedDesigns.length === selectableDesigns.length);
        } else {
            setSelectAll(false);
        }
    }, [selectedDesigns, verifiedDesigns]);


    // --- Fetch verified designs ---
    useEffect(() => {
        const fetchDesigns = async () => {
            if (!projectId) return;

            setLoading(true);
            setError(null);

            try {
                const response = await axios.get(
                    `http://localhost:3001/designverified/${projectId}`
                );
                const designsData = Array.isArray(response.data) ? response.data : [];
                setVerifiedDesigns(designsData);

            } catch (err) {
                console.error("Error fetching verified designs:", err);
                setError("Failed to load verified designs. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchDesigns();
    }, [projectId]);


    // --- Handle individual selection ---
    const handleSelect = (id) => {
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

    // --- Handle Create Baseline (with Toast onClose Navigation) ---
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
                // Store success message to show before history potentially adds warnings/info
                const baselineSuccessMessage = "Baseline set successfully!";

                // 2. Add History entries
                console.log("Starting history creation...");
                const historyPromises = selectedDesigns.map((designId) => {
                    const fullDesignData = verifiedDesigns.find(design => design.design_id === designId);
                    if (!fullDesignData) {
                        console.error(`[History] Could not find full data for design_id: ${designId}.`);
                        return Promise.resolve({ status: 'skipped', designId, reason: 'Data not found' });
                    }

                    let { design_id, requirement_id, design_type, diagram_name, diagram_type, design_description } = fullDesignData;
                    const design_status = "BASELINE";

                    let processedReqIds = [];
                     try {
                       if (requirement_id) {
                           let parsedIds;
                           if (typeof requirement_id === 'string') {
                               // Handle JSON string, potentially malformed
                               try {
                                   parsedIds = JSON.parse(requirement_id);
                               } catch (parseError) {
                                   console.warn(`[History] Malformed JSON for requirement_id for designId: ${designId}:`, requirement_id, parseError);
                                   // Attempt to extract numbers if it looks like "{0: '1', ...}" or just a number string
                                   if (/^\{.*\}$/.test(requirement_id.trim()) || /^\d+$/.test(requirement_id.trim())) {
                                      // Very basic extraction, might need refinement
                                      const numbers = requirement_id.match(/\d+/g);
                                      if (numbers) {
                                          parsedIds = numbers.map(n => parseInt(n, 10));
                                      } else {
                                          parsedIds = [];
                                      }
                                   } else {
                                       parsedIds = [];
                                   }
                               }
                           } else {
                               parsedIds = requirement_id; // Assume it's already array/object/number
                           }

                           if (Array.isArray(parsedIds)) {
                               processedReqIds = parsedIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                           } else if (typeof parsedIds === 'object' && parsedIds !== null) {
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

                    const reqHistoryPromises = processedReqIds.map(reqId => {
                         const historyPayload = {
                             design_id: design_id?.toString() || '',
                             requirement_id: reqId,
                             design_type: design_type || '',
                             diagram_name: diagram_name || '',
                             diagram_type: diagram_type || '',
                             design_description: design_description || '',
                             design_status
                         };
                         console.log(`[History] Sending payload for designId: ${designId}, requirement_id: ${reqId}:`, historyPayload);
                         return axios.post("http://localhost:3001/addHistoryDesign", historyPayload)
                             .then(response => ({ status: 'fulfilled', designId, reqId, response }))
                             .catch(error => {
                                 const errorMessage = `[History] Error adding history for designId: ${designId}, reqId: ${reqId}: ${error.response?.data?.message || error.message}`;
                                 console.error(errorMessage, error.response || error);
                                 return Promise.resolve({ status: 'rejected', designId, reqId, error: errorMessage }); // Resolve for settled
                             });
                     });

                    if (processedReqIds.length === 0) {
                       console.warn(`[History] No valid requirement_id for designId: ${designId}. Creating history entry without req_id.`);
                       const historyPayload = {
                            design_id: design_id?.toString() || '',
                            requirement_id: null,
                            design_type: design_type || '',
                            diagram_name: diagram_name || '',
                            diagram_type: diagram_type || '',
                            design_description: design_description || '',
                            design_status
                       };
                       console.log(`[History] Sending payload for designId: ${designId} (no req_id):`, historyPayload);
                       reqHistoryPromises.push(
                           axios.post("http://localhost:3001/addHistoryDesign", historyPayload)
                                .then(response => ({ status: 'fulfilled', designId, reqId: null, response }))
                                .catch(error => {
                                    const errorMessage = `[History] Error adding history for designId: ${designId} (no req_id): ${error.response?.data?.message || error.message}`;
                                    console.error(errorMessage, error.response || error);
                                    return Promise.resolve({ status: 'rejected', designId, reqId: null, error: errorMessage });
                                })
                       );
                    }

                    return Promise.allSettled(reqHistoryPromises); // Return settled promises for this design's reqs
                });

                // Wait for all history additions (for all selected designs) to settle
                const results = await Promise.allSettled(historyPromises);
                console.log("History addition results (settled):", results);

                let historyWarning = false;
                // Check detailed results if needed
                results.forEach(designResult => {
                   if (designResult.status === 'fulfilled' && Array.isArray(designResult.value)) {
                       designResult.value.forEach(reqResult => {
                           if (reqResult.status === 'rejected') {
                               historyWarning = true;
                               console.error(`History add failed for Design ID: ${reqResult.designId}, Req ID: ${reqResult.reqId}, Reason: ${reqResult.error}`);
                           }
                       });
                   } else if (designResult.status === 'rejected' || designResult.value?.status === 'skipped') {
                       historyWarning = true; // Mark warning if the promise for a design failed or was skipped
                       console.error(`Processing failed/skipped for design ID: ${designResult.reason || designResult.value?.designId}`);
                   }
                });

                // 3. Update Frontend State (BEFORE showing final toast and navigating)
                setVerifiedDesigns((prev) =>
                    prev.filter((design) => !selectedDesigns.includes(design.design_id))
                );
                setSelectedDesigns([]); // Clear selection

                // 4. Show Final Toast and Navigate on Close
                const finalMessage = baselineSuccessMessage + (historyWarning ? " (Some history entries may have failed)" : "");
                const toastType = historyWarning ? toast.warning : toast.success; // Show warning if any history failed

                toastType(finalMessage, {
                    onClose: () => {
                        console.log("Final toast closed, navigating now...");
                        navigate(`/DesignBaseline?project_id=${projectId}`);
                    }
                });


            } else {
                // Handle non-201 status from baseline creation
                throw new Error(responseCreateBaseline.data.message || "Failed to set baseline.");
            }
        } catch (error) {
            console.error("Error creating baseline or adding history:", error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || "An error occurred. Please try again.";
            toast.error(errorMessage);
            setIsSubmitting(false); // Ensure submitting is reset on catch
        } finally {
            // setIsSubmitting(false); // Resetting is now handled within success/error paths to allow navigation logic
             if (!isSubmitting) { // Only reset if it wasn't reset in the try block (e.g., if initial API failed)
                setIsSubmitting(false);
             }
        }
    };


    // --- Handle Cancel ---
    const handleCancel = () => {
        navigate(`/DesignBaseline?project_id=${projectId}`);
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
                <div className="create-design-baseline-header-right"></div>
            </div>

            <div className="create-design-baseline-content">
                {loading ? (
                    <CreateDesignBaselineLoadingState />
                ) : error ? (
                    <CreateDesignBaselineErrorState message={error} />
                ) : verifiedDesigns.length === 0 ? (
                    <CreateDesignBaselineEmptyState />
                ) : (
                    <div className="create-design-baseline-card">
                        <div className="create-design-baseline-card-header">
                            <div className="create-design-baseline-title-section">
                                <ListIcon />
                                <h2>Verified Designs</h2>
                            </div>
                            <div className="create-design-baseline-selection-info">
                                <span>{selectedDesigns.length} of {verifiedDesigns.filter(d=>d.design_status !== 'BASELINE').length} selected</span>
                            </div>
                        </div>

                        <div className="create-design-baseline-table-container">
                            <table className="create-design-baseline-table">
                                <thead>
                                    <tr>
                                        <th className="col-checkbox">
                                            {/* RENAMED checkbox container class */}
                                            <div className="create-design-baseline-checkbox-container">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    id="select-all-designs"
                                                    // RENAMED styled checkbox class
                                                    className="create-design-baseline-styled-checkbox"
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
                                    {verifiedDesigns.map((design) => (
                                        <tr
                                            key={design.design_id}
                                            className={`create-design-baseline-row ${selectedDesigns.includes(design.design_id) ? 'selected' : ''} ${design.design_status === 'BASELINE' ? 'is-baseline' : ''}`}
                                            // Use onClick only if not baseline
                                            onClick={design.design_status !== 'BASELINE' ? () => handleSelect(design.design_id) : undefined}
                                            // Remove inline style, rely on CSS class 'is-baseline' for cursor/opacity
                                        >
                                            <td className="col-checkbox">
                                                 {/* RENAMED checkbox container class */}
                                                <div className="create-design-baseline-checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDesigns.includes(design.design_id)}
                                                        disabled={design.design_status === 'BASELINE'}
                                                        onChange={() => handleSelect(design.design_id)}
                                                        id={`design-${design.design_id}`}
                                                        // RENAMED styled checkbox class
                                                        className="create-design-baseline-styled-checkbox"
                                                    />
                                                    <label htmlFor={`design-${design.design_id}`}></label>
                                                </div>
                                            </td>
                                            <td className="col-id">
                                                {/* RENAMED design ID class */}
                                                <span className="create-design-baseline-design-id">{formatDesignId(design.design_id)}</span>
                                            </td>
                                            <td className="col-name">{design.diagram_name || 'N/A'}</td>
                                            <td className="col-type">{design.diagram_type || 'N/A'}</td>
                                            <td className="col-status">
                                                <DesignStatusBadge status={design.design_status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="create-design-baseline-actions">
                            <button
                                className="create-design-baseline-cancel-button"
                                onClick={handleCancel}
                                disabled={isSubmitting} // Also disable cancel during submit
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

            {/* Ensure ToastContainer is rendered */}
            <ToastContainer
                position="top-right"
                autoClose={3000} // Auto close after 3 seconds
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored" // Use colored theme for default styling
            />
        </div>
    );
};

export default CreateDesignbaseline;