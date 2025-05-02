import React, { useEffect, useState, useMemo, useCallback } from "react"; // Added useCallback
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faLayerGroup, faSave, faTimes, // Use faTimes for Cancel
    faSpinner, faExclamationTriangle, faInfoCircle // Import icons
} from '@fortawesome/free-solid-svg-icons';

// --- CSS Import ---
import "./CSS/createBaselineTrace.css"; // <<--- Import CSS for this component

// Helper function: flattenNestedDataForTable (เหมือนเดิม)
const flattenNestedDataForTable = (data) => {
    const flatRows = [];
    if (!Array.isArray(data) || data.length === 0) return flatRows;
    data.forEach((req, reqIndex) => {
        if (!req || typeof req !== 'object') { console.warn("Skipping invalid req item"); return; }
        const reqId = req.RequirementID; const reqName = req.RequirementName || `Requirement ${reqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        let reqRowCount = 0; let isFirstReqRow = true;
        // For this page, we *do* want to show everything, even if links are incomplete
        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({ key: `req-${reqIndex}-no-design`, reqId: `REQ-${reqId}`, reqName: reqName, designId: "-", designName: "-", implId: "-", implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 }); return;
        }
        designs.forEach((design, designIndex) => {
            if (!design || typeof design !== 'object') { console.warn("Skipping invalid design item"); return; }
            let designRowCount = 0; let isFirstDesignRow = true;
            const designId = design.DesignID; const designName = design.DiagramName || `Design ${designId}`;
            const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];
            if (implementations.length === 0) {
                designRowCount = 1;
                flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-no-impl`, reqId: `REQ-${reqId}`, reqName: reqName, designId: `DE-${designId}`, designName: designName, implId: "-", implFile: null, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 }); reqRowCount += designRowCount; isFirstReqRow = false; return;
            }
            implementations.forEach((impl, implIndex) => {
                if (!impl || typeof impl !== 'object') { console.warn("Skipping invalid impl item"); return; }
                let implRowCount = 0; let isFirstImplRow = true;
                const implId = impl.ImplementID; const implFile = impl.ImplementFilename;
                const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];
                if (testCases.length === 0) {
                    implRowCount = 1;
                    flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-impl-${implIndex}-no-tc`, reqId: `REQ-${reqId}`, reqName: reqName, designId: `DE-${designId}`, designName: designName, implId: `IMP-${implId}`, implFile: implFile, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1 }); designRowCount += implRowCount; isFirstReqRow = false; isFirstDesignRow = false; return;
                }
                testCases.forEach((tc, tcIndex) => {
                    if (!tc || typeof tc !== 'object') { console.warn("Skipping invalid tc item"); return; }
                    implRowCount++; const tcId = tc.TestCaseID; const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                    flatRows.push({ key: `req-${reqIndex}-design-${designIndex}-impl-${implIndex}-tc-${tcIndex}`, reqId: `REQ-${reqId}`, reqName: reqName, designId: `DE-${designId}`, designName: designName, implId: `IMP-${implId}`, implFile: implFile, testCaseId: `TC-${tcId}`, testCaseName: tcName, isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: isFirstImplRow, implRowSpan: 0 }); isFirstReqRow = false; isFirstDesignRow = false; isFirstImplRow = false;
                });
                const firstImplRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}-design-${designIndex}-impl-${implIndex}`)); if (firstImplRowIndex !== -1 && flatRows[firstImplRowIndex]) flatRows[firstImplRowIndex].implRowSpan = implRowCount; designRowCount += implRowCount;
            });
            const firstDesignRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}-design-${designIndex}`)); if (firstDesignRowIndex !== -1 && flatRows[firstDesignRowIndex]) flatRows[firstDesignRowIndex].designRowSpan = designRowCount; reqRowCount += designRowCount;
        });
        const firstReqRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqIndex}`)); if (firstReqRowIndex !== -1 && flatRows[firstReqRowIndex]) flatRows[firstReqRowIndex].reqRowSpan = reqRowCount;
    });
    return flatRows;
};


// --- Component หลัก ---
const CreateBaselineTrace = () => {
    const [nestedData, setNestedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false); // Add saving state
    const [error, setError] = useState(null);
    const [projectName, setProjectName] = useState(''); // State for project name
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const selectedRound = queryParams.get("round"); // Source round

    // Fetch Data
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null); setNestedData([]); setProjectName('');
        if (!projectId || !selectedRound) {
            setError("Project ID or Source Round is missing from URL."); setLoading(false); return;
        }
        const roundNumber = parseInt(selectedRound, 10);
        if (isNaN(roundNumber)) { setError("Invalid Round number."); setLoading(false); return; }

        try {
            // Fetch Project Name
            try {
                 const nameResponse = await axios.get(`http://localhost:3001/projectname?project_id=${projectId}`);
                 setProjectName((nameResponse.data && nameResponse.data.length > 0) ? nameResponse.data[0].project_name : `Project ${projectId}`);
             } catch (nameError) { setProjectName(`Project ${projectId}`); }

            // Fetch verification data for the selected source round
            const response = await axios.get("http://localhost:3001/getTableVeriTracebyRound", {
                params: { project_id: projectId, create_round: selectedRound },
            });
            if (response.data?.success && Array.isArray(response.data.data)) {
                setNestedData(response.data.data);
                if (response.data.data.length === 0) {
                    console.log(`No verification data for project ${projectId}, round ${selectedRound}`);
                    // Set error if no data to baseline
                    setError(`No data found in round ${selectedRound} to create a baseline.`);
                }
            } else { throw new Error(response.data.message || "Failed to fetch valid data."); }
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(`Error fetching data: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    }, [projectId, selectedRound]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate display rows
    const displayRows = useMemo(() => flattenNestedDataForTable(nestedData), [nestedData]);

    // Handle Save Baseline
    const handleSave = async () => {
        setSaving(true); // Start saving indicator
        const storedUsername = localStorage.getItem("username");
        if (!storedUsername) {
            toast.error("User session expired. Please log in again.");
            setSaving(false); return;
        }
        const sourceRoundInt = parseInt(selectedRound, 10);
        if (isNaN(sourceRoundInt)) { toast.error("Invalid source round."); setSaving(false); return; }
        if (nestedData.length === 0 || displayRows.length === 0) {
             toast.info("No traceability links to create baseline from.");
             setSaving(false); return;
         }

        try {
            // 1. Get next baseline round number
            const maxRoundResult = await axios.get(`http://localhost:3001/getMaxBaselineRound/${projectId}`);
            let nextRound = (maxRoundResult.data?.maxRound !== null) ? maxRoundResult.data.maxRound + 1 : 1;

            // 2. Prepare data payload (Iterate through original nested data)
            const savePromises = [];
            nestedData.forEach(req => {
                 const reqId = req.RequirementID;
                 const designs = req.Designs || [];
                 if (designs.length === 0) { // Handle Req without design
                     savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: null, implement_id: null, testcase_id: null, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt }));
                 } else {
                     designs.forEach(design => {
                         const designId = design.DesignID;
                         const implementations = design.Implementations || [];
                         if (implementations.length === 0) { // Handle Design without Impl
                             savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: designId, implement_id: null, testcase_id: null, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt }));
                         } else {
                             implementations.forEach(impl => {
                                 const implId = impl.ImplementID;
                                 const testCases = impl.TestCases || [];
                                 if (testCases.length === 0) { // Handle Impl without TC
                                     savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: designId, implement_id: implId, testcase_id: null, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt }));
                                 } else {
                                     testCases.forEach(tc => { // Handle complete link
                                         const tcId = tc.TestCaseID;
                                         savePromises.push(axios.post("http://localhost:3001/saveBaselineTrace", { project_id: projectId, requirement_id: reqId, design_id: designId, implement_id: implId, testcase_id: tcId, baselinetrace_by: storedUsername, baselinetrace_round: nextRound, create_round: sourceRoundInt }));
                                     });
                                 }
                             });
                         }
                     });
                 }
             });

             if (savePromises.length === 0) {
                  toast.info("No valid links found to save."); setSaving(false); return;
             }

            // 3. Execute all save requests
            await Promise.all(savePromises);
            console.log(`Baseline round ${nextRound} records saved.`);

            // 4. Update source round status to BASELINE
            try {
                const statusUpdatePayload = { project_id: projectId, create_round: selectedRound, new_status: "BASELINE" };
                await axios.put('http://localhost:3001/updateVerificationStatusByRound', statusUpdatePayload);
                console.log(`Updated status for source round ${selectedRound}.`);
            } catch (statusUpdateError) {
                console.error(`Error updating status for source round ${selectedRound}:`, statusUpdateError);
                toast.warning(`Baseline created, but failed to update status of round ${selectedRound}.`);
            }

            // 5. Success feedback and navigate
            toast.success(`Baseline round ${nextRound} created successfully!`, {
                onClose: () => { navigate(`/viewBaselineTrace?project_id=${projectId}`); }, autoClose: 2500
            });

        } catch (error) {
            console.error("Error saving baseline trace", error);
            toast.error(`Error creating baseline: ${error.response?.data?.message || error.message}`);
        } finally {
            setSaving(false); // End saving indicator
        }
    };

     // Handle Cancel
     const handleCancel = () => {
         // Navigate back to the page where the user selected the round, likely SetBaselineTrace or VersionVerTrace/BaselineHistory
         // Using navigate(-1) is often safer here unless the previous page is fixed
         navigate(-1);
         // Alternatively: navigate(`/setBaselineTrace?project_id=${projectId}`);
     };

    // --- Render Logic ---
    return (
        // *** Use cb- prefix ***
        <div className="cb-container">
            {/* Header */}
            <div className="cb-header">
                 <button className="cb-back-btn" onClick={handleCancel}> {/* Back button should cancel */}
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                 </button>
                 <h1 className="cb-title">
                    <FontAwesomeIcon icon={faLayerGroup} className="cb-title-icon" />
                     Create New Baseline from Round {selectedRound || '?'}
                 </h1>
            </div>

            {/* Content Area */}
            <div className="cb-content">
                 {loading && ( <div className="cb-loading"><FontAwesomeIcon icon={faSpinner} spin size="2x" /><p>Loading data...</p></div> )}
                 {error && !loading && ( <div className="cb-error-message"><FontAwesomeIcon icon={faExclamationTriangle} size="2x" /><p>Error</p><span className="cb-error-details">{error}</span></div> )}

                 {!loading && !error && displayRows.length === 0 && (
                     <div className="cb-no-data">
                         <p>No data available in Round {selectedRound} to create a baseline.</p>
                     </div>
                 )}

                 {!loading && !error && displayRows.length > 0 && (
                     <>
                        {/* Confirmation Table Section */}
                        <div className="cb-table-section">
                             <h2 className="cb-box-title">Confirm Traceability Links for New Baseline</h2>
                             <div className="cb-table-container">
                                 <table className="cb-table">
                                     <thead><tr><th>Requirement</th><th>Design</th><th>Code</th><th>Test Case</th></tr></thead>
                                     <tbody>
                                         {displayRows.map((row) => (
                                             <tr key={row.key}>
                                                 {row.isFirstReqRow && (<td rowSpan={row.reqRowSpan}><div className="cb-req-id">{row.reqId}</div>{row.reqName && row.reqName !== `Requirement ${row.reqId.split('-')[1]}` && (<div className="cb-item-detail">{row.reqName}</div>)}</td>)}
                                                 {row.isFirstDesignRow && (<td rowSpan={row.designRowSpan}>{row.designId}{row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId.split('-')[1]}` && (<div className="cb-item-detail">{row.designName}</div>)}</td>)}
                                                 {row.isFirstImplRow && (<td rowSpan={row.implRowSpan}>{row.implId}{row.implFile && row.implFile !== 'N/A' ? (<div className="cb-item-detail">{row.implFile}</div>) : null}</td>)}
                                                 <td>{row.testCaseId}{row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId.split('-')[1]}` ? (<div className="cb-item-detail">{row.testCaseName}</div>) : null}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         </div>

                         {/* Action Buttons Area */}
                         <div className="cb-button-container">
                             <button className="cb-cancel-button" onClick={handleCancel} disabled={saving}>
                                <FontAwesomeIcon icon={faTimes} /> Cancel
                             </button>
                             <button className="cb-create-button" onClick={handleSave} disabled={saving || loading}>
                                <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
                                {saving ? "Creating..." : "Create New Baseline"}
                             </button>
                         </div>
                    </>
                )}
            </div> {/* End cb-content */}
        </div> // End cb-container
    );
};

export default CreateBaselineTrace;