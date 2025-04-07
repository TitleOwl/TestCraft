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
        // ... (useEffect logic remains the same) ...
        const fetchRequirement = async (requirementId) => {
            try {
                const response = await axios.get(`http://localhost:3001/requirement/${requirementId}`);
                setRequirement(response.data);
                fetchHistory(response.data.requirement_id);
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
        if (location.state?.requirement?.requirement_id) {
            requirementIdToFetch = location.state.requirement.requirement_id;
            setRequirement(location.state.requirement);
            fetchHistory(requirementIdToFetch);
        } else if (location.search) {
            const queryParams = new URLSearchParams(location.search);
            const requirementIdFromUrl = queryParams.get('requirement_id');
            if (requirementIdFromUrl) {
                requirementIdToFetch = requirementIdFromUrl;
                fetchRequirement(requirementIdToFetch);
            } else {
                 console.error("Requirement ID not found in URL params.");
                 setLoadingHistory(false);
            }
        } else {
             console.error("Requirement ID not provided.");
             setLoadingHistory(false);
        }
    }, [location]);

    const verifiedHistoryData = historyData.filter(history => history.requirement_status === 'VERIFIED');
    const validatedHistoryData = historyData.filter(history => history.requirement_status === 'VALIDATED');

    const projectId = requirement?.project_id || '';

    if (!requirement && loadingHistory) {
        return <p>Loading requirement data...</p>;
    }

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

    // *** เพิ่มฟังก์ชันสำหรับนำทางไปยัง HistoryValidationReq ***
    const navigateToValiHistory = (reqId) => {
        if (reqId) {
            // Navigate using URL Path Param
            navigate(`/HistoryValidationReq/${reqId}`);
        } else {
            console.error("Missing requirementId for Vali navigation");
        }
    };
    // *********************************************************

    return (
        <div>
            {/* --- Requirement Details Container (เหมือนเดิม) --- */}
            <div className="view-requirement-container">
                 <button
                    onClick={() =>
                        navigate(`/Dashboard?project_id=${projectId}`, {
                            state: { selectedSection: "Requirement" },
                        })
                    }
                    className="backreq-button"
                    disabled={!projectId}
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
                            {Array.isArray(requirement.filereq_ids) && requirement.filereq_ids.length > 0 ? (
                                <ul>
                                    {requirement.filereq_ids.map((filereq_id, index) => (
                                        <li key={index} className="file-item" style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => {
                                                const file = { filereq_id, requirement_id: requirement.requirement_id };
                                                navigate(`/ViewFile?filereq_id=${file.filereq_id}`, { state: { file } });
                                            }}>
                                            {filereq_id}
                                        </li>
                                    ))}
                                </ul>
                            ) : (<span>No File IDs available</span>)}
                        </span>
                    </p>
                </div>
                <div className="view-requirement-text">
                    <p><strong className="view-requirement-description">Description:</strong></p>
                    <p className="view-requirement-paragraph">{requirement.requirement_description}</p>
                </div>
            </div>

            {/* --- Full History Table (เหมือนเดิม) --- */}
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

            {/* --- Verified History Table (เหมือนเดิม) --- */}
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

            {/* --- Validated History Table (อัปเดตส่วนนี้) --- */}
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
                            {/* *** เพิ่ม Header *** */}
                            <th>Validation Details</th>
                            {/* ******************* */}
                        </tr>
                    </thead>
                    <tbody>
                        {loadingHistory ? (
                            // *** อัปเดต colSpan ***
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
                                        {/* *** เพิ่ม Cell และ Button *** */}
                                        <td>
                                            <button
                                                className="view-validation-history-btn" // Add class for styling if needed
                                                onClick={() => navigateToValiHistory(history.requirement_id)} // ใช้ requirement_id จาก history
                                            >
                                                 {/* <FontAwesomeIcon icon={faHistory} /> */}
                                                 View Validation
                                            </button>
                                        </td>
                                        {/* ************************** */}
                                    </tr>
                                );
                            })
                        ) : (
                            // *** อัปเดต colSpan ***
                            <tr><td colSpan="5">No validated history available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* ******************************************* */}

        </div>
    );
};

export default ViewEditReq;