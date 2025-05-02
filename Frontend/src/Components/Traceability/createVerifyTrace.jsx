import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEye, faArrowLeft, faListCheck, faUsers, faSpinner,
    faExclamationTriangle, faInfoCircle, faFloppyDisk, faBan
} from '@fortawesome/free-solid-svg-icons';

// --- CSS Import ---
// Import ไฟล์ CSS ที่สร้างขึ้นสำหรับ Component นี้โดยเฉพาะ
// (ตรวจสอบ Path และชื่อไฟล์ให้ถูกต้อง)
import './CSS/createVerifyTrace.css'; // <<--- Import ไฟล์นี้เท่านั้น

// --- Helper Function: flattenTraceabilityData (เหมือนเดิม) ---
const flattenTraceabilityData = (nestedData) => {
    // ... (โค้ด flattenTraceabilityData เหมือนเดิมทุกประการ) ...
    const flatRows = [];
    if (!nestedData || nestedData.length === 0) { return flatRows; }
    nestedData.forEach(req => {
        let reqRowCount = 0; let isFirstReqRow = true;
        const reqId = req.RequirementID;
        const reqName = req.RequirementName || `Requirement ${reqId}`;
        const designs = Array.isArray(req.Designs) ? req.Designs : [];
        if (designs.length === 0) {
            reqRowCount = 1;
            flatRows.push({ key: `req-${reqId}-no-design`, reqId: reqId, reqName: reqName, designId: "-", designName: "-", implId: "-", implFile: "-", testCaseId: "-", testCaseName: "-", isFirstReqRow: true, reqRowSpan: 1, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 }); return;
        }
        designs.forEach((design) => {
            let designRowCount = 0; let isFirstDesignRow = true;
            const designId = design.DesignID;
            const designName = design.DiagramName || `Design ${designId}`;
            const implementations = Array.isArray(design.Implementations) ? design.Implementations : [];
            if (implementations.length === 0) {
                designRowCount = 1;
                flatRows.push({ key: `req-${reqId}-design-${designId}-no-impl`, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: "-", implFile: "-", testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: true, designRowSpan: 1, isFirstImplRow: true, implRowSpan: 1 });
                reqRowCount += designRowCount; isFirstReqRow = false; return;
            }
            implementations.forEach((impl) => {
                let implRowCount = 0; let isFirstImplRow = true;
                const implId = impl.ImplementID;
                const implFile = impl.ImplementFilename;
                const testCases = Array.isArray(impl.TestCases) ? impl.TestCases : [];
                if (testCases.length === 0) {
                    implRowCount = 1;
                    flatRows.push({ key: `req-${reqId}-design-${designId}-impl-${implId}-no-tc`, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: "-", testCaseName: "-", isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: true, implRowSpan: 1 });
                    designRowCount += implRowCount; isFirstReqRow = false; isFirstDesignRow = false; return;
                }
                testCases.forEach((tc) => {
                    implRowCount++; const tcId = tc.TestCaseID; const tcName = tc.TestCaseName || `Test Case ${tcId}`;
                    flatRows.push({ key: `req-${reqId}-design-${designId}-impl-${implId}-tc-${tcId}`, reqId: reqId, reqName: reqName, designId: designId, designName: designName, implId: implId, implFile: implFile, testCaseId: tcId, testCaseName: tcName, isFirstReqRow: isFirstReqRow, reqRowSpan: 0, isFirstDesignRow: isFirstDesignRow, designRowSpan: 0, isFirstImplRow: isFirstImplRow, implRowSpan: 0 });
                    isFirstReqRow = false; isFirstDesignRow = false; isFirstImplRow = false;
                });
                const firstImplRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}-design-${designId}-impl-${implId}`)); if (firstImplRowIndex !== -1 && flatRows[firstImplRowIndex]) flatRows[firstImplRowIndex].implRowSpan = implRowCount; designRowCount += implRowCount;
            });
            const firstDesignRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}-design-${designId}`)); if (firstDesignRowIndex !== -1 && flatRows[firstDesignRowIndex]) flatRows[firstDesignRowIndex].designRowSpan = designRowCount; reqRowCount += designRowCount;
        });
        const firstReqRowIndex = flatRows.findIndex(row => row.key.startsWith(`req-${reqId}`)); if (firstReqRowIndex !== -1 && flatRows[firstReqRowIndex]) flatRows[firstReqRowIndex].reqRowSpan = reqRowCount;
    });
    // console.log("Flattened Rows with Names (CreateVerifyTrace):", flatRows);
    return flatRows;
};

// --- Main Component ---
const CreateVerifyTrace = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- State ---
    const [members, setMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const [membersError, setMembersError] = useState(null);
    const [traceabilityData, setTraceabilityData] = useState([]);
    const [isLoadingTrace, setIsLoadingTrace] = useState(true);
    const [traceError, setTraceError] = useState(null);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // --- Fetch Members (เหมือนเดิม) ---
    useEffect(() => {
        // ... (โค้ด Fetch Members เหมือนเดิม) ...
        if (projectId) {
            setIsLoadingMembers(true); setMembersError(null); setMembers([]);
            axios.get(`http://localhost:3001/projectname?project_id=${projectId}`)
                .then((res) => {
                    if (Array.isArray(res.data) && res.data[0]?.project_member) {
                        try {
                            const membersData = JSON.parse(res.data[0].project_member);
                            setMembers(Array.isArray(membersData) ? membersData : []);
                        } catch (parseError) {
                            console.error("Error parsing project members:", parseError);
                            setMembersError("Invalid project member data format.");
                        }
                    } else { setMembersError("Project member data not found or invalid."); }
                })
                .catch((err) => {
                    console.error("Failed to load project members:", err);
                    setMembersError("Failed to load project members.");
                })
                .finally(() => setIsLoadingMembers(false));
        } else {
            setMembersError("Project ID not found in URL.");
            setIsLoadingMembers(false);
        }
    }, [projectId]);

    // --- Fetch traceability data (Baseline) (เหมือนเดิม) ---
    useEffect(() => {
        // ... (โค้ด Fetch Traceability Data เหมือนเดิม) ...
        if (projectId) {
            setIsLoadingTrace(true); setTraceError(null); setTraceabilityData([]);
            axios.get("http://localhost:3001/traceability", { params: { projectId } })
                .then((response) => {
                    // console.log("Traceability Data Received (CreateVerifyTrace):", response.data);
                    if (Array.isArray(response.data)) {
                        setTraceabilityData(response.data);
                    } else {
                        console.error("Traceability API response is not an array");
                        setTraceError("Invalid traceability data format received.");
                    }
                })
                .catch((err) => {
                    console.error("Error fetching traceability data:", err);
                    setTraceError("Failed to fetch traceability data.");
                })
                .finally(() => setIsLoadingTrace(false));
        } else {
            setTraceError("Project ID not found in URL.");
            setIsLoadingTrace(false);
        }
    }, [projectId]);

    // --- Flattened Traceability Data for Table (เหมือนเดิม) ---
    const tableRows = useMemo(() => flattenTraceabilityData(traceabilityData), [traceabilityData]);

    // --- Handlers (เหมือนเดิม ยกเว้นส่วน Logic ไม่เปลี่ยน) ---
    const handleMemberSelection = (memberName) => {
        setSelectedMembers((prev) =>
            prev.includes(memberName)
                ? prev.filter((name) => name !== memberName)
                : [...prev, memberName]
        );
    };

    const handleSaveVerification = async () => {
        // ... (โค้ด Save Verification Logic เหมือนเดิม) ...
        const currentUser = localStorage.getItem("username");
        const roundKey = `create_round_${projectId}`;
        const currentRound = parseInt(localStorage.getItem(roundKey) || '1');

        if (!currentUser || !projectId || selectedMembers.length === 0 || !tableRows || tableRows.length === 0) {
            toast.error("Incomplete information: Missing user, project ID, selected members, or traceability data.");
            return;
        }

        const verificationByObject = selectedMembers.reduce((acc, memberName) => {
            acc[memberName] = false;
            return acc;
        }, {});
        const verificationByJsonString = JSON.stringify(verificationByObject);
        const status = "WAITING FOR VERIFICATION";

        const rowsToInsert = tableRows.map(row => {
            const parseId = (id) => (id !== null && id !== "-" && !isNaN(parseInt(id))) ? parseInt(id) : null;
            const reqIdForDb = parseId(row.reqId);
            const designIdForDb = parseId(row.designId);
            const implIdForDb = parseId(row.implId);
            const testCaseIdForDb = parseId(row.testCaseId);

            if (reqIdForDb === null) {
                console.warn("Skipping row due to null Requirement ID:", row);
                return null;
            }

            return [
                parseInt(projectId), currentUser, reqIdForDb, designIdForDb,
                implIdForDb, testCaseIdForDb, verificationByJsonString, status, currentRound
            ];
        }).filter(row => row !== null);

        if (rowsToInsert.length === 0) {
            toast.warning("No valid traceability links found to create verification records for.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await axios.post("http://localhost:3001/saveVerificationTrace", { rowsToInsert });
            if (response.data.success) {
                const nextRound = currentRound + 1;
                localStorage.setItem(roundKey, nextRound.toString());
                toast.success("Verification traceability records created successfully!", {
                    onClose: () => {
                        navigate(`/Dashboard?project_id=${projectId}`, {
                            state: { selectedSection: "Traceability" }
                        });
                    },
                    autoClose: 2000
                });
                setSelectedMembers([]);
            } else {
                toast.error(`Failed to save data: ${response.data.message || 'Unknown server error'}`);
            }
        } catch (error) {
            console.error("Error saving verification trace:", error);
            const errorMsg = error.response?.data?.message || error.message || "Server error or connection issue.";
            toast.error(`Error occurred: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGoBack = () => {
        navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } });
    };

    // --- Render Helper for Loading/Error/Empty States (เปลี่ยน Class Name) ---
    const renderInfoState = (isLoading, error, data, type) => {
        const messages = {
            trace: { loading: "Loading Traceability Data...", error: "Error loading traceability data:", empty: "No Baseline Traceability Data Found", emptyIcon: faInfoCircle },
            members: { loading: "Loading Project Members...", error: "Error loading project members:", empty: "No Project Members Found", emptyIcon: faUsers }
        };
        const config = messages[type];
        // *** เปลี่ยน Class Name ตรงนี้ ***
        const loadingClass = "traceveri-loading";
        const errorClass = "traceveri-error-message";
        const emptyClass = "traceveri-empty-state";

        if (isLoading) {
            return (
                <div className={loadingClass}>
                    <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                    <p>{config.loading}</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className={errorClass}>
                    <FontAwesomeIcon icon={faExclamationTriangle} size="lg" />
                    <p>{config.error} {error}</p>
                </div>
            );
        }
        if ( (type === 'trace' && (!traceabilityData || traceabilityData.length === 0)) ||
             (type === 'members' && (!members || members.length === 0)) ) {
            return (
                <div className={emptyClass}>
                    <FontAwesomeIcon icon={config.emptyIcon} size="lg" />
                    <p>{config.empty}</p>
                </div>
            );
        }
        return null;
    };


    // --- JSX Structure (ใช้ Class Name ใหม่ ที่ขึ้นต้นด้วย traceveri-) ---
    return (
        // *** เปลี่ยน Class Name ทั้งหมด ***
        <div className="traceveri-container">
            {/* Header */}
            <div className="traceveri-header">
                <button onClick={handleGoBack} className="traceveri-back-btn">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faListCheck} className="traceveri-title-icon" />
                    Create Verification Traceability Record
                </h1>
            </div>

            {/* Content Panels */}
            <div className="traceveri-content">

                {/* Left Panel: Traceability Table */}
                <div className="traceveri-left-panel">
                    <div className="traceveri-panel-header">
                        <h2>
                            <FontAwesomeIcon icon={faListCheck} /> Baseline Traceability Links
                            { !isLoadingTrace && !traceError && tableRows.length > 0 &&
                                <span className="traceveri-count-badge">{tableRows.length}</span>
                            }
                        </h2>
                    </div>
                    {/* Loading/Error/Empty State for Traceability */}
                    {renderInfoState(isLoadingTrace, traceError, tableRows, 'trace')}

                    {/* Table Container */}
                    {!isLoadingTrace && !traceError && tableRows.length > 0 && (
                         <div className="traceveri-table-container">
                             {/* เปลี่ยนชื่อ class ของ table ด้วย */}
                             <table className="traceveri-table">
                                 <thead>
                                     <tr>
                                         <th>Requirement</th>
                                         <th>Design</th>
                                         <th>Code Component</th>
                                         <th>Test Case</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {tableRows.map((row) => (
                                         <tr key={row.key}>
                                             {row.isFirstReqRow && (
                                                 <td rowSpan={row.reqRowSpan}>
                                                     {/* เปลี่ยนชื่อ class หรือจะใช้ชื่อเดิมก็ได้ ถ้าไม่ซ้ำ */}
                                                     <div className="traceveri-req-id">REQ-{row.reqId}</div>
                                                      {row.reqName && row.reqName !== `Requirement ${row.reqId}` && (
                                                          <div className="traceveri-item-detail">{row.reqName}</div>
                                                      )}
                                                     <a
                                                         href={`/viewReqTrace?requirement_id=${row.reqId}`}
                                                         target="_blank"
                                                         rel="noopener noreferrer"
                                                         title="View Requirement Details"
                                                         className="traceveri-view-button" // เปลี่ยนชื่อ class button
                                                         onClick={() => console.log("Viewing req:", row.reqId)}
                                                     >
                                                         <FontAwesomeIcon icon={faEye} /> View
                                                     </a>
                                                 </td>
                                             )}
                                             {row.isFirstDesignRow && (
                                                 <td rowSpan={row.designRowSpan}>
                                                     {row.designId !== "-" ? `DE-${row.designId}` : "-"}
                                                     {row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId}` && (
                                                         <div className="traceveri-item-detail">{row.designName}</div> // ใช้ class กลางๆ
                                                     )}
                                                 </td>
                                             )}
                                             {row.isFirstImplRow && (
                                                 <td rowSpan={row.implRowSpan}>
                                                     {row.implId !== "-" ? `IMP-${row.implId}` : "-"}
                                                     {row.implFile && row.implFile !== 'N/A' && (
                                                         <div className="traceveri-item-detail">{row.implFile}</div> // ใช้ class กลางๆ
                                                     )}
                                                 </td>
                                             )}
                                             <td>
                                                 {row.testCaseId !== "-" ? `TC-${row.testCaseId}` : "-"}
                                                 {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId}` && (
                                                     <div className="traceveri-item-detail">{row.testCaseName}</div> // ใช้ class กลางๆ
                                                 )}
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                    )}
                </div>

                {/* Right Panel: Select Verifiers & Summary */}
                <div className="traceveri-right-panel">
                    <div className="traceveri-panel-header">
                        <h2>
                            <FontAwesomeIcon icon={faUsers} /> Select Verifiers
                            { !isLoadingMembers && !membersError && members.length > 0 &&
                                <span className="traceveri-count-badge">{members.length}</span>
                            }
                        </h2>
                    </div>

                    {/* Loading/Error/Empty State for Members */}
                     {renderInfoState(isLoadingMembers, membersError, members, 'members')}

                    {/* Member List */}
                    {!isLoadingMembers && !membersError && members.length > 0 && (
                        <div className="traceveri-reviewers-container">
                             <div className="traceveri-reviewers-list">
                                {members.map((member, index) => (
                                    <div key={index} className="traceveri-reviewer-item">
                                        <input
                                            type="checkbox" classname="trace"
                                            id={`member-${index}`}
                                            onChange={() => handleMemberSelection(member.name)}
                                            checked={selectedMembers.includes(member.name)}
                                            disabled={isSaving}
                                        />
                                        <label htmlFor={`member-${index}`} className="traceveri-reviewer-label">
                                            <span className="traceveri-reviewer-name">{member.name}</span>
                                            <span className="traceveri-reviewer-role">
                                                ({member.roles?.join(", ") || 'No Roles Assigned'})
                                            </span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary Section */}
                    <div className="traceveri-summary">
                        <h3>Summary</h3>
                        <div className="traceveri-summary-item">
                            <span>Traceability Links Found:</span>
                            <span className="traceveri-summary-count">{isLoadingTrace ? '...' : tableRows.length}</span>
                        </div>
                         <div className="traceveri-summary-item">
                             <span>Verifiers Selected:</span>
                             <span className="traceveri-summary-count">{selectedMembers.length}</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons Area */}
            <div className="traceveri-action-buttons">
                <button
                    onClick={handleGoBack}
                    className="traceveri-btn-cancel" // เปลี่ยน Class
                    disabled={isSaving}
                >
                    <FontAwesomeIcon icon={faBan} /> Cancel
                </button>
                <button
                    onClick={handleSaveVerification}
                    className="traceveri-btn-create" // เปลี่ยน Class
                    disabled={
                        isSaving ||
                        isLoadingTrace || !!traceError || tableRows.length === 0 ||
                        isLoadingMembers || !!membersError || members.length === 0 ||
                        selectedMembers.length === 0
                    }
                >
                    <FontAwesomeIcon icon={isSaving ? faSpinner : faFloppyDisk} spin={isSaving} />
                    {isSaving ? "Saving..." : "Create Verification Records"}
                </button>
            </div>
        </div>
    );
};

export default CreateVerifyTrace;