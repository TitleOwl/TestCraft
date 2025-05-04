import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import ModalVeriTestcase from './ModalVeriTestcase'; // <<< Ensure path is correct
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheckSquare,
    faListAlt,
    faSearch,
    faSync, // Using faSync to match the previous example structure
    faUser,
    faCalendarAlt,
    faEye,
    faCheck,
    faTimes, // Keep for clear search
    faClipboardList,
    faHistory
} from '@fortawesome/free-solid-svg-icons';

// Import the dedicated CSS file
import "./testcase_css/VeriTestcase.css"; // <<< Ensure path is correct

// Helper function to format date (moved outside for cleaner component)
const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-GB', options);
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return "Invalid Date";
    }
};


const VeriTestcase = () => {
    const [testcases, setTestcases] = useState([]);
    const [filteredTestcases, setFilteredTestcases] = useState([]);
    const [selectedDetailsForModal, setSelectedDetailsForModal] = useState({}); // Renamed state
    const [assignedReviewersForModal, setAssignedReviewersForModal] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    const fetchTestcases = useCallback(() => {
        setLoading(true);
        setIsRefreshing(true);
        return axios
            .get(`http://localhost:3001/verilisttestcase?project_id=${projectId}`)
            .then((response) => {
                console.log("Fetched Testcases:", response.data);
                const groupedTestcase = response.data.reduce((acc, tc) => {
                    const round = tc.veritestcase_round;
                    // --- Start Grouping ---
                    if (!acc[round]) {
                        // Initialize with the first test case found for this round
                        acc[round] = {
                            ...tc, // Copy all properties from the first tc of this round
                            // Ensure testcase_id is an array, filtering out null/undefined
                            testcase_id: [tc.testcase_id].filter(id => id != null),
                            // Process veritestcase_by correctly
                            veritestcase_by: typeof tc.veritestcase_by === "object" && tc.veritestcase_by !== null
                                ? Object.entries(tc.veritestcase_by).map(([name, value]) => ({ name, value: value === true }))
                                : [],
                        };
                    } else {
                        // Add subsequent testcase_id if it's not null/undefined and not already present
                        if (tc.testcase_id != null && !acc[round].testcase_id.includes(tc.testcase_id)) {
                            acc[round].testcase_id.push(tc.testcase_id);
                        }

                        // Merge reviewers carefully (avoiding duplicates)
                        if (typeof tc.veritestcase_by === "object" && tc.veritestcase_by !== null) {
                            const newVeri = Object.entries(tc.veritestcase_by).map(([name, value]) => ({ name, value: value === true }));
                            if (!Array.isArray(acc[round].veritestcase_by)) {
                                acc[round].veritestcase_by = []; // Should not happen if initialized correctly, but safe check
                            }
                            const existingReviewerMap = new Map(acc[round].veritestcase_by.map(r => [r.name, r]));
                            newVeri.forEach(nr => {
                                if (!existingReviewerMap.has(nr.name)) {
                                    // Only add if reviewer not already listed for this round
                                    acc[round].veritestcase_by.push(nr);
                                    existingReviewerMap.set(nr.name, nr); // Update map
                                }
                            });
                        }
                        // Update other fields if necessary (e.g., if later entries have more complete data, though unlikely here)
                         // acc[round].create_by = acc[round].create_by || tc.create_by; // Example if needed
                         // acc[round].veritestcase_at = acc[round].veritestcase_at || tc.veritestcase_at; // Example if needed
                    }
                    // --- End Grouping ---
                    return acc;
                }, {});


                const processedTestcases = Object.values(groupedTestcase)
                    .filter((tc) => tc.testcase_status === "WAITING FOR VERIFICATION")
                     // Optional: Sort the rounds if needed
                     .sort((a, b) => (a.veritestcase_round || 0) - (b.veritestcase_round || 0));


                console.log("Processed Testcases:", processedTestcases);
                setTestcases(processedTestcases);

            })
            .catch((err) => {
                console.error("Error fetching testcases:", err);
                toast.error("Error fetching test cases.");
            })
            .finally(() => {
                 setLoading(false);
                 setIsRefreshing(false);
            });
    }, [projectId]);

    useEffect(() => {
        fetchTestcases();
    }, [fetchTestcases]);

    // Filter logic
    useEffect(() => {
        let result = [...testcases];
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            result = result.filter(
                tc =>
                    `verif-${tc.veritestcase_round}`.toLowerCase().includes(lowerSearchTerm) ||
                    (tc.create_by && tc.create_by.toLowerCase().includes(lowerSearchTerm))
            );
        }
        setFilteredTestcases(result);
    }, [testcases, searchTerm]);


    // Renamed handler for clarity
    const handleViewDetails = (testcaseRoundData) => {
         console.log("Details passed to modal:", testcaseRoundData); // Log what's being sent
         // Pass the entire grouped object for the round to the modal
        setSelectedDetailsForModal({
            verif_round: testcaseRoundData.veritestcase_round,
            created_by: testcaseRoundData.create_by,
            assigned_date: testcaseRoundData.veritestcase_at,
            linked_testcases: testcaseRoundData.testcase_id || [], // Ensure it's an array
        });
        setAssignedReviewersForModal(testcaseRoundData.veritestcase_by || []);
        setShowModal(true);
    };

    const handleVerifyClick = (tc) => {
        if (!projectId || !tc?.veritestcase_id) { // Check for veritestcase_id specifically
             toast.error("Invalid project ID or verification round data.");
             return;
        }
        const testcaseIds = Array.isArray(tc.testcase_id) ? tc.testcase_id.filter(id => id != null) : [];
         if (testcaseIds.length === 0) {
             toast.error("No valid Test Case IDs found for this verification round.");
             return;
         }
        const testcaseIdString = testcaseIds.join(",");
        const veritestcaseId = tc.veritestcase_id; // ID of the verification round entry

        console.log("Navigating to Verify:", { projectId, testcaseIdString, veritestcaseId });
        navigate(`/TestcaseVerifed?project_id=${projectId}&testcase_id=${testcaseIdString}&veritestcase_id=${veritestcaseId}`, {
            state: {
                selectedTestcaseIds: testcaseIds,
                project_id: projectId,
                veritestcase_id: veritestcaseId // Pass the verification round ID
             }
        });
    };

    const handleBackToDashboard = () => {
        navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Testcase" } });
    };


    const closeModal = () => setShowModal(false);

    // --- Render Logic ---
    if (loading && !isRefreshing) {
         return (
             <div className="container-veritestcase">
                 <div className="loading-state-veritestcase">
                     <div className="loading-spinner-veritestcase"></div>
                     <p>Loading test case verifications...</p>
                 </div>
             </div>
         );
    }

    const handleGoToHistory = () => {
        if (projectId) {
            navigate(`/VeriTestHis?project_id=${projectId}`);
        } else {
            console.error("Cannot navigate to history: Project ID is missing.");
            toast.error("Project ID is missing, cannot view history.");
        }
    };

    return (
        <div className="container-veritestcase">
            {/* Header */}
            <div className="header-veritestcase">
                <button className="back-button-veritestcase" onClick={handleBackToDashboard}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="page-title-veritestcase">
                    <FontAwesomeIcon icon={faCheckSquare} className="title-icon-veritestcase" />
                    Test Case Verification List
                </h1>
            </div>

            {/* Content */}
            <div className="content-veritestcase">
                <div className="panel-veritestcase">
                    {/* Panel Header & Tools */}
                    <div className="panel-header-veritestcase">
                        <h2>
                            <FontAwesomeIcon icon={faListAlt} />
                            Verification Requests
                            <span className="count-badge-veritestcase">{filteredTestcases.length}</span>
                        </h2>
                        <div className="tools-veritestcase">
                            <div className="search-veritestcase">
                                <FontAwesomeIcon icon={faSearch} className="search-icon-veritestcase" />
                                <input
                                    type="text"
                                    placeholder="Search by ID or creator..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input-veritestcase"
                                />
                                {searchTerm && (
                                    <button
                                        className="clear-search-veritestcase"
                                        onClick={() => setSearchTerm("")}
                                        title="Clear search"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                )}
                            </div>
                                                        {/* History Button */}
                                                        <button
                                                            className="veritestcase-history-btn"
                                                            onClick={handleGoToHistory}
                                                            title="View Verification History"
                                                            // Style moved to CSS
                                                        >
                                                            <FontAwesomeIcon icon={faHistory} /> History
                                                        </button>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="table-container-veritestcase">
                        {loading && isRefreshing ? (
                             <div className="loading-state-veritestcase"><div className="loading-spinner-veritestcase"></div></div>
                        ) : filteredTestcases.length === 0 ? (
                            <div className="empty-state-veritestcase">
                                <FontAwesomeIcon icon={faClipboardList} className="empty-icon-veritestcase" />
                                <p>{searchTerm ? "No results match your search" : "No test cases waiting for verification."}</p>
                                {searchTerm && <p className="empty-subtitle-veritestcase">Try different search terms.</p>}
                            </div>
                        ) : (
                            <table className="table-veritestcase">
                                <thead>
                                    <tr>
                                        <th className="th-verif-round-veritestcase">Round</th>
                                        <th className="th-created-by-veritestcase">Create By</th>
                                        <th className="th-date-assigned-veritestcase">Date Assign</th>
                                        <th className="th-status-veritestcase">Status</th>
                                        <th className="th-details-veritestcase">Details</th> {/* Changed Header */}
                                        <th className="th-actions-veritestcase">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTestcases.map((tc) => (
                                        // Use veritestcase_id or round as key, ensure uniqueness
                                        <tr key={tc.veritestcase_id || tc.veritestcase_round} className="row-veritestcase">
                                            <td className="cell-verif-round-veritestcase">{`VERIF-${tc.veritestcase_round}`}</td>
                                            <td className="cell-created-by-veritestcase">
                                                <div className="creator-info-veritestcase">
                                                    <FontAwesomeIcon icon={faUser} className="cell-icon-veritestcase" />
                                                    <span>{tc.create_by || "N/A"}</span>
                                                </div>
                                            </td>
                                            <td className="cell-date-assigned-veritestcase">
                                                <div className="date-info-veritestcase">
                                                    <FontAwesomeIcon icon={faCalendarAlt} className="cell-icon-veritestcase" />
                                                    <span>{formatDate(tc.veritestcase_at)}</span>
                                                </div>
                                            </td>
                                            <td className="cell-status-veritestcase">
                                                <span className={`status-badge-veritestcase status-waiting-veritestcase`}>
                                                    {tc.testcase_status?.replace(/_/g, ' ') || "N/A"}
                                                </span>
                                            </td>
                                            <td className="cell-details-veritestcase"> {/* Changed Class */}
                                                <button
                                                    // Changed class name for clarity
                                                    className="view-details-btn-veritestcase"
                                                     // Updated title
                                                    title="View Linked Test Cases & Reviewers"
                                                    onClick={() => handleViewDetails(tc)} // Pass the whole grouped tc object
                                                >
                                                    <FontAwesomeIcon icon={faEye}  className="cell-iconeye-veritestcase"/>
                                                </button>
                                            </td>
                                            <td className="cell-actions-veritestcase">
                                                <button
                                                    className='verify-button-veritestcase'
                                                    onClick={() => handleVerifyClick(tc)}
                                                    // disabled={tc.testcase_status !== "WAITING FOR VERIFICATION"}
                                                >
                                                    <FontAwesomeIcon icon={faCheck} className="button-icon-veritestcase"/>
                                                    View
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

            {/* Modal */}
            <ModalVeriTestcase
                show={showModal}
                onClose={closeModal}
                // Pass the structured details object
                details={selectedDetailsForModal}
                // Pass the reviewers array
                veritestcaseBy={assignedReviewersForModal}
            />
        </div>
    );
};

export default VeriTestcase;