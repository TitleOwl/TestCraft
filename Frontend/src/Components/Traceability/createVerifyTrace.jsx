import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import './CSS/traceabilityPage.css'; // ตรวจสอบ Path
import createvervar from "./image/createvervar.png"; // ตรวจสอบ Path
import { toast } from "react-toastify";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Import เพิ่มเติม
import { faEye } from '@fortawesome/free-solid-svg-icons'; // Import เพิ่มเติม

const flattenTraceabilityData = (nestedData) => {
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
    console.log("Flattened Rows with Names (CreateVerifyTrace):", flatRows);
    return flatRows;
};

// --- Component หลัก ---
const CreateVerifyTrace = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // --- State (เหมือนเดิม) ---
    const [members, setMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const [membersError, setMembersError] = useState(null);
    const [traceabilityData, setTraceabilityData] = useState([]);
    const [isLoadingTrace, setIsLoadingTrace] = useState(true);
    const [traceError, setTraceError] = useState(null);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [step, setStep] = useState(1);
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- Fetch Members (เหมือนเดิม) ---
    useEffect(() => {
        if (projectId) {
            setIsLoadingMembers(true); setMembersError(null); setMembers([]);
            axios.get(`http://localhost:3001/projectname?project_id=${projectId}`)
                .then((res) => {
                    if (Array.isArray(res.data) && res.data[0]?.project_member) {
                        try { const membersData = JSON.parse(res.data[0].project_member); setMembers(Array.isArray(membersData) ? membersData : []); }
                        catch (parseError) { console.error("Error parsing project members:", parseError); setMembersError("Invalid project member data format."); }
                    } else { setMembersError("Project member data not found or invalid."); }
                })
                .catch((err) => { console.error("Failed to load project members:", err); setMembersError("Failed to load project members."); })
                .finally(() => setIsLoadingMembers(false));
        } else { setMembersError("Project ID not found in URL."); setIsLoadingMembers(false); }
    }, [projectId]);

    // --- Fetch traceability data (เหมือนเดิม) ---
    useEffect(() => {
        if (projectId) {
            setIsLoadingTrace(true); setTraceError(null); setTraceabilityData([]);
            axios.get("http://localhost:3001/traceability", { params: { projectId } }) // ดึงจาก /traceability (Baseline)
                .then((response) => {
                    console.log("Traceability Data Received (CreateVerifyTrace):", response.data);
                    if (Array.isArray(response.data)) { setTraceabilityData(response.data); }
                    else { console.error("Traceability API response is not an array"); setTraceError("รูปแบบข้อมูล Traceability ไม่ถูกต้อง"); }
                })
                .catch((err) => { console.error("Error fetching traceability data:", err); setTraceError("ไม่สามารถดึงข้อมูล Traceability ได้"); })
                .finally(() => setIsLoadingTrace(false));
        } else { setTraceError("Project ID not found in URL."); setIsLoadingTrace(false); }
    }, [projectId]);

    // --- แปลงข้อมูล Traceability เป็น Flat Rows (ใช้ Helper ที่อัปเดตแล้ว) ---
    const tableRows = useMemo(() => flattenTraceabilityData(traceabilityData), [traceabilityData]);

    // --- Handlers (เหมือนเดิม) ---
    const handleMemberSelection = (memberName) => { setSelectedMembers((prev) => prev.includes(memberName) ? prev.filter((name) => name !== memberName) : [...prev, memberName]); };

    const handleSaveVerification = async () => {
        const currentUser = localStorage.getItem("username");
        const roundKey = `create_round_${projectId}`;
        const currentRound = parseInt(localStorage.getItem(roundKey) || '1');

        if (!currentUser || !projectId || step !== 2 || selectedMembers.length === 0 || !tableRows || tableRows.length === 0) {
            toast.error("Incomplete or incorrect information.");
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
                parseInt(projectId),
                currentUser,
                reqIdForDb,
                designIdForDb,
                implIdForDb,
                testCaseIdForDb,
                verificationByJsonString,
                status,
                currentRound
            ];
        }).filter(row => row !== null);

        if (rowsToInsert.length === 0) {
            toast.warning("No valid data found for saving.");
            return;
        }

        console.log("Data to Insert:", rowsToInsert);

        try {
            const response = await axios.post("http://localhost:3001/saveVerificationTrace", { rowsToInsert });
            if (response.data.success) {
                toast.success("Verification traceability record saved successfully!", {
                    onClose: () => {
                        const nextRound = currentRound + 1;
                        localStorage.setItem(roundKey, nextRound.toString());
                        setSelectedMembers([]);
                        navigate(`/Dashboard?project_id=${projectId}`, {
                            state: { selectedSection: "Traceability" }
                        });
                    },
                    autoClose: 2000
                });

                const nextRound = currentRound + 1;
                localStorage.setItem(roundKey, nextRound.toString());
                setSelectedMembers([]);
                navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } });
            } else {
                toast.error(`Failed to save data: ${response.data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error saving verification trace:", error);
            const errorMsg = error.response?.data?.message || error.message || "Server error or connection issue.";
            toast.error(`Error occurred: ${errorMsg}`);
        }
    };

    const handleNextStep = () => { if (tableRows.length > 0) setStep(2); else alert("ไม่พบข้อมูล Traceability สำหรับสร้าง Verification"); };
    const handleBackStep = () => { setStep(1); };
    const handleViewRequirement = (reqId) => { window.open(`/viewReqTrace?requirement_id=${reqId}`, '_blank'); console.log("View requirement:", reqId); };

    return (
        <div className="create-verify-container">
            <button className="backveri-trace" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } })}>Back</button>
            <h1>Create Verification Traceability Record</h1>

            {/* ----- STEP 1: Display Traceability Table ----- */}
            {step === 1 && (
                <>
                    {isLoadingTrace && <div className="loading-message"><p>Loading Traceability Data...</p></div>}
                    {traceError && <div className="error-message">{traceError}</div>}
                    {!isLoadingTrace && !traceError && tableRows.length === 0 && (<div className="no-data-message">ไม่พบข้อมูล Baseline Traceability</div>)}
                    {!isLoadingTrace && !traceError && tableRows.length > 0 && (
                        <table className="traceability-table">
                            <thead>
                                <tr>
                                    <th>Requirement ID / Name</th>
                                    <th>Design ID / Name</th>
                                    <th>Code Component ID / Filename</th>
                                    <th>Test Case ID / Name</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableRows.map((row) => (
                                    <tr key={row.key}>
                                        {/* Requirement Cell */}
                                        {row.isFirstReqRow && (
                                            <td rowSpan={row.reqRowSpan} className="requirement-cell">
                                                <div className="reqid-trace" onClick={() => handleViewRequirement(row.reqId)} >
                                                    {`REQ-${row.reqId}`}
                                                </div>
                                                {row.reqName && row.reqName !== `Requirement ${row.reqId}` ? (
                                                    <div className="reqname-trace" >{row.reqName}</div>
                                                ) : null}
                                                <button title="View Requirement Details" className="button-req-trace" style={{ marginTop: '5px', padding: '2px 5px' }} onClick={() => navigate(`/viewReqTrace?requirement_id=${row.reqId}`)}>
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>
                                            </td>
                                        )}
                                        {/* Design Cell */}
                                        {row.isFirstDesignRow && (
                                            <td rowSpan={row.designRowSpan}>
                                                {row.designId !== "-" ? `DE-${row.designId}` : "-"}
                                                {row.designName && row.designName !== "-" && row.designName !== `Design ${row.designId}` ? (
                                                    <><br /><div className="reqname-trace" >{row.designName}</div></>
                                                ) : null}
                                            </td>
                                        )}
                                        {/* Implementation Cell */}
                                        {row.isFirstImplRow && (
                                            <td rowSpan={row.implRowSpan}>
                                                {row.implId !== "-" ? (
                                                    <>
                                                        {`IMP-${row.implId}`}
                                                        {row.implFile && row.implFile !== 'N/A' ? (
                                                            <><br /><div className="reqname-trace" >{row.implFile}</div></>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                        )}
                                        {/* Test Case Cell */}
                                        <td>
                                            {row.testCaseId !== "-" ? `TC-${row.testCaseId}` : "-"}
                                            {row.testCaseName && row.testCaseName !== "-" && row.testCaseName !== `Test Case ${row.testCaseId}` ? (
                                                <><br /><div className="reqname-trace" >{row.testCaseName}</div></>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <button onClick={handleNextStep} disabled={isLoadingTrace || !!traceError || tableRows.length === 0}> Next </button>
                </>
            )}

            {step === 2 && (
                <>
                    {isLoadingMembers ? (<div className="loading-message"><p>Loading project members...</p></div>)
                        : membersError ? (<div className="error-message">{membersError}</div>)
                            : members.length === 0 ? (<div className="no-data-message">ไม่พบข้อมูลสมาชิกโปรเจกต์</div>)
                                : (<div>
                                    <h3>Select Members for Verification</h3>
                                    <div className="members-list">
                                        {members.map((member, index) => (
                                            <div key={index} className="member-item">
                                                <input type="checkbox" id={`member-${index}`} onChange={() => handleMemberSelection(member.name)} checked={selectedMembers.includes(member.name)} />
                                                <label htmlFor={`member-${index}`} className="member-label">
                                                    <span className="member-name">{member.name}</span>
                                                    <span className="member-roles">({member.roles?.join(", ") || 'No Roles'})</span>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>)
                    }
                    <button onClick={handleSaveVerification} disabled={isLoadingMembers || !!membersError || selectedMembers.length === 0}> Save Verification </button>
                    <button onClick={handleBackStep}>Back</button>
                </>
            )}
        </div>
    );
};

export default CreateVerifyTrace;