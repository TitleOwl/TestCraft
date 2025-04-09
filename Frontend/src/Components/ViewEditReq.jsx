import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CSS/ViewEditReq.css'; // Ensure this CSS file exists and is imported correctly
import backtoreq from '../image/arrow_left.png'; // Ensure the image path is correct
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Uncomment if using icons
// import { faEye, faHistory } from '@fortawesome/free-solid-svg-icons'; // Uncomment if using icons

const ViewEditReq = () => {
    const location = useLocation();
    const navigate = useNavigate(); // useNavigate hook
    const [requirement, setRequirement] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Function to format date and time
    const formatDate = (dateString) => {
        if (!dateString) {
            return { date: 'N/A', time: 'N/A' };
        }
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                 console.error("Invalid date string:", dateString);
                return { date: 'Invalid Date', time: '' };
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const formattedDate = `${day}/${month}/${year}`;
            const formattedTime = `${hours}:${minutes}:${seconds}`;
            return { date: formattedDate, time: formattedTime };
        } catch (error) {
            console.error("Error formatting date:", dateString, error);
            return { date: 'Error', time: '' };
        }
    };

    useEffect(() => {
        const fetchRequirement = async (requirementId) => {
            try {
                const response = await axios.get(`http://localhost:3001/requirement/${requirementId}`);
                console.log('[FRONTEND] Received raw response data:', JSON.stringify(response.data));
                // *** Check the console log above to confirm the actual key for file IDs ***
                // Example logs (adjust 'files' if your key is different):
                console.log('[FRONTEND] Does response.data have "files" key?', response.data.hasOwnProperty('files'));
                console.log('[FRONTEND] Value of response.data.files:', response.data.files);

                setRequirement(response.data);
                // Ensure requirement_id exists before fetching history
                if (response.data && response.data.requirement_id) {
                    fetchHistory(response.data.requirement_id);
                } else {
                     console.error("Requirement ID missing in fetched data, cannot fetch history.");
                     setLoadingHistory(false);
                }
            } catch (error) {
                console.error('Error fetching requirement:', error);
                setRequirement(null);
                setLoadingHistory(false);
            }
        };

        const fetchHistory = async (requirementId) => {
            setLoadingHistory(true);
            try {
                const response = await axios.get('http://localhost:3001/getHistoryByRequirementId', {
                    params: { requirement_id: requirementId }
                });
                console.log('History Data Received:', response.data);
                if (response.data && Array.isArray(response.data.data)) {
                    setHistoryData(response.data.data);
                } else {
                     console.warn('History data is not in expected format or is empty:', response.data);
                    setHistoryData([]);
                }
            } catch (error) {
                console.error('Error fetching history:', error);
                setHistoryData([]);
            } finally {
                setLoadingHistory(false);
            }
        };

        let requirementIdToFetch = null;
        // Prefer fetching fresh data if coming from URL directly
        if (location.search) {
            const queryParams = new URLSearchParams(location.search);
            const requirementIdFromUrl = queryParams.get('requirement_id');
            if (requirementIdFromUrl) {
                requirementIdToFetch = requirementIdFromUrl;
                fetchRequirement(requirementIdToFetch); // Fetch fresh data
            } else {
                 console.error("Requirement ID not found in URL params.");
                 setLoadingHistory(false);
            }
        }
        // Use state only if no URL param (e.g., navigating back)
        else if (location.state?.requirement?.requirement_id) {
            requirementIdToFetch = location.state.requirement.requirement_id;
            setRequirement(location.state.requirement); // Use potentially stale data from state
            fetchHistory(requirementIdToFetch); // Still fetch history
        }
        // No ID found anywhere
        else {
             console.error("Requirement ID not provided.");
             setLoadingHistory(false);
        }
    }, [location]); // Rerun effect if location changes

    // Filter history data after it's loaded
    const verifiedHistoryData = historyData.filter(history => history.requirement_status === 'VERIFIED');
    const validatedHistoryData = historyData.filter(history => history.requirement_status === 'VALIDATED');

    // Safely access project_id only if requirement exists
    const projectId = requirement?.project_id || '';

    // Loading state for the main requirement data
    if (!requirement && loadingHistory) { // Show loading if requirement isn't set AND history is still loading (initial load)
        return <p>Loading requirement data...</p>;
    }

    // Error state if requirement failed to load
    if (!requirement) {
         return <p>Requirement data could not be loaded or does not exist.</p>;
    }

    // Function to navigate to Verification Criteria Details
    const navigateToVeriDetails = (reqId) => {
        if (projectId && reqId) {
            navigate(`/VericriReqDetails?project_id=${projectId}&requirement_id=${reqId}`);
        } else {
            console.error("Missing projectId or requirementId for Veri navigation");
        }
    };

    // Function to navigate to HistoryValidationReq
    const navigateToValiHistory = (reqId) => {
        if (reqId) {
            navigate(`/HistoryValidationReq/${reqId}`);
        } else {
            console.error("Missing requirementId for Vali navigation");
        }
    };

// *** Helper function to get the correct file array ***
const getFileArray = () => {
    const fileKey = 'filereq_ids'; // <--- แก้เป็นชื่อนี้ (ตรงตามรูปภาพ)
    if (requirement && Array.isArray(requirement[fileKey])) {
        return requirement[fileKey]; // จะได้ [1] ออกมา
    }
    return [];
};

    const filesToDisplay = getFileArray();

    return (
        <div>
            {/* --- Requirement Details Container --- */}
            <div className="view-requirement-container">
                <button
                    onClick={() =>
                        navigate(`/Dashboard?project_id=${projectId}`, {
                            state: { selectedSection: "Requirement" },
                        })
                    }
                    className="backreq-button"
                    disabled={!projectId} // Disable if projectId is not available
                >
                    <img src={backtoreq} alt="backtoreq" className="backtoreq" />
                </button>
                <div className="view-requirement-header-with-button">
                    <h1 className="view-requirement-title">Requirement: {requirement.requirement_name}</h1>
                </div>
                <div className="view-requirement-header">
                    <p><strong className="view-requirement-label">ID:</strong> REQ-0{requirement.requirement_id}</p>
                    <p><strong className="view-requirement-label">Type:</strong> {requirement.requirement_type}</p>
                    <p><strong className="view-requirement-label">Status:</strong> {requirement.requirement_status}</p>
                    <p>
                        <strong className="view-requirement-label">File ID:</strong>
                        <span>
                            {/* *** UPDATED FILE DISPLAY LOGIC *** */}
                            {filesToDisplay.length > 0 ? (
                                <ul>
                                    {filesToDisplay.map((fileId, index) => ( // Assuming it's an array of IDs
                                        <li key={index} className="file-item" style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => {
                                                // Prepare data for ViewFile page
                                                const file = {
                                                    filereq_id: fileId, // Pass the ID
                                                    requirement_id: requirement.requirement_id
                                                    // You might need to fetch file details (like name) separately
                                                    // or ensure the backend includes them if needed on the ViewFile page.
                                                };
                                                // Navigate to ViewFile, passing filereq_id in query params and file object in state
                                                navigate(`/ViewFile?filereq_id=${file.filereq_id}`, { state: { file } });
                                            }}>
                                            {fileId} {/* Display the File ID */}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span>No File IDs available</span> // Displayed if array is empty or data wasn't an array
                            )}
                             {/* ****************************** */}
                        </span>
                    </p>
                </div>
                <div className="view-requirement-text">
                    <p><strong className="view-requirement-description">Description:</strong></p>
                    <p className="view-requirement-paragraph">{requirement.requirement_description}</p>
                </div>
            </div>

            {/* --- Full History Table --- */}
            <div className="view-requirement-container">
                 <div className="view-requirement-header-with-button">
                    <h1 className="view-requirement-title">Full History: {requirement.requirement_name}</h1>
                </div>
                <table className="requirement-history-table">
                    <thead>
                        <tr>
                            <th>Requirement Status</th>
                            <th>Date</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingHistory ? (
                            <tr><td colSpan="3">Loading history...</td></tr>
                        ) : Array.isArray(historyData) && historyData.length > 0 ? (
                            historyData.map((history, index) => {
                                const { date, time } = formatDate(history.historyreq_at);
                                return (
                                    <tr key={`full-${index}`}>
                                        <td>{history.requirement_status}</td>
                                        <td>{date}</td>
                                        <td>{time}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="3">No history available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- Verified History Table --- */}
            <div className="view-requirement-container">
                <div className="view-requirement-header-with-button">
                    <h1 className="view-requirement-title">Verified History</h1>
                </div>
                <table className="requirement-history-table verified-history-table">
                    <thead>
                        <tr>
                            <th>Requirement Name</th>
                            <th>Requirement Status</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingHistory ? (
                            <tr><td colSpan="5">Loading history...</td></tr>
                        ) : verifiedHistoryData.length > 0 ? (
                            verifiedHistoryData.map((history, index) => {
                                const { date, time } = formatDate(history.historyreq_at);
                                return (
                                    <tr key={`verified-${index}`}>
                                        <td>{history.requirement_name}</td>
                                        <td>{history.requirement_status}</td>
                                        <td>{date}</td>
                                        <td>{time}</td>
                                        <td>
                                            <button
                                                className="view-details-btn"
                                                onClick={() => navigateToVeriDetails(history.requirement_id)}
                                            >
                                                {/* <FontAwesomeIcon icon={faEye} /> */}
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="5">No verified history available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- Validated History Table --- */}
            <div className="view-requirement-container">
                <div className="view-requirement-header-with-button">
                    <h1 className="view-requirement-title">Validated History</h1>
                </div>
                <table className="requirement-history-table validated-history-table">
                     <thead>
                        <tr>
                            <th>Requirement Name</th>
                            <th>Requirement Status</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Validation Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingHistory ? (
                            <tr><td colSpan="5">Loading history...</td></tr>
                        ) : validatedHistoryData.length > 0 ? (
                            validatedHistoryData.map((history, index) => {
                                const { date, time } = formatDate(history.historyreq_at);
                                return (
                                    <tr key={`validated-${index}`}>
                                        <td>{history.requirement_name}</td>
                                        <td>{history.requirement_status}</td>
                                        <td>{date}</td>
                                        <td>{time}</td>
                                        <td>
                                            <button
                                                className="view-validation-history-btn" // Add class for styling if needed
                                                onClick={() => navigateToValiHistory(history.requirement_id)} // Use requirement_id from history
                                            >
                                                 {/* <FontAwesomeIcon icon={faHistory} /> */}
                                                 View Validation
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="5">No validated history available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default ViewEditReq;