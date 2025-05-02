import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'; // <<--- แก้ไข Import ให้ครบ
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faHistory, faCalendarAlt, faSearch, faSort, faSortUp,
    faLayerGroup, faEye, faSpinner, faExclamationTriangle, faPlus , faTimes // เพิ่ม faTimes ถ้าใช้ใน Alert
} from '@fortawesome/free-solid-svg-icons';

// *** ใช้ CSS ไฟล์เดิมที่แก้ปุ่ม Back แล้ว (bh- prefix) ***
import "./CSS/versionVerTrace.css"; // หรือ versionVerTrace.css ตามที่คุณตั้งชื่อ

// --- Component หลัก (ใช้ชื่อ VersionVerTrace หรือ BaselineHistory ตามที่คุณใช้) ---
const VersionVerTrace = () => { // หรือ const BaselineHistory = () => {
    const [baselineData, setBaselineData] = useState([]);
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const queryParams = new URLSearchParams(window.location.search);
    const projectId = queryParams.get("project_id");
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        setError('');
        setBaselineData([]);
        setProjectName('');

        if (!projectId) {
            setError('Project ID is missing in the URL.');
            setLoading(false);
            return;
        }

        axios.get(`http://localhost:3001/viewBaselineTrace?project_id=${projectId}`)
            .then(response => {
                if (response.data && response.data.success) {
                    setProjectName(response.data.project_name || 'N/A');
                    const data = Array.isArray(response.data.data) ? response.data.data : [];
                    setBaselineData(data);
                    setError('');
                } else {
                    console.error("API success=false or unexpected structure:", response.data);
                    setError(response.data?.message || 'Received unexpected data structure.');
                    setBaselineData([]);
                    setProjectName('Error');
                }
            })
            .catch(errorInstance => {
                console.error("Error fetching baseline data:", errorInstance);
                let errorMessage = '';
                if (errorInstance.response) {
                    errorMessage = `Error: ${errorInstance.response.data?.message || `Status ${errorInstance.response.status}`}`;
                } else if (errorInstance.request) {
                    errorMessage = 'Error: No response from server.';
                } else {
                    errorMessage = `Error: ${errorInstance.message}`;
                }
                setError(errorMessage);
                setBaselineData([]);
                setProjectName('Error');
            })
            .finally(() => {
                setLoading(false);
            });

    }, [projectId]);

    // Calculate unique baseline rounds using useMemo
    const uniqueBaselineRounds = useMemo(() => {
        if (!Array.isArray(baselineData) || baselineData.length === 0) return [];
        const roundMap = new Map();
        // Iterate backwards to keep the *latest* entry for each round if duplicates exist
        for (let i = baselineData.length - 1; i >= 0; i--) {
            const item = baselineData[i];
            if (item && typeof item.baselinetrace_round !== 'undefined' && item.baselinetrace_round !== null) {
                if (!roundMap.has(item.baselinetrace_round)) {
                    roundMap.set(item.baselinetrace_round, item);
                }
            }
        }
        // Convert map values back to array and sort by round ascending
        return Array.from(roundMap.values()).sort((a, b) => a.baselinetrace_round - b.baselinetrace_round);
    }, [baselineData]);

    const handleViewRound = (round) => {
        navigate(`/viewBaselineRound?project_id=${projectId}&round=${round}`);
    };

    const handleSetBaseline = () => {
        navigate(`/setBaselineTrace?project_id=${projectId}`);
    }

    const handleBack = () => {
        navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } });
    }

    // --- Render Logic ---
    return (
        <div className="vbt-container"> {/* Use vbt- prefix */}
            {/* Header */}
            <div className="vbt-header">
                <button className="vbt-back-btn" onClick={handleBack} aria-label="Go back">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="vbt-title">
                    <FontAwesomeIcon icon={faLayerGroup} className="vbt-title-icon" />
                   Traceability Record Baseline History
                </h1>
            </div>

            {/* Content Area */}
            <div className="vbt-content">
                {loading ? (
                    <div className="vbt-loading">
                        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                        <p>Loading baseline history...</p>
                    </div>
                ) : error ? (
                    <div className="vbt-error-message">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                        <p>Error Loading Data</p>
                        <span className="vbt-error-details">{error}</span>
                        {/* Optionally add retry button if needed */}
                        {/* <button onClick={fetchInitialData} className="vbt-retry-button">Retry</button> */}
                    </div>
                ) : (
                    // Table Container
                    <div className="vbt-table-container">
                        <table className="vbt-table">
                            <thead>
                                <tr>
                                    <th>Baseline Round</th>
                                    <th>Set Baseline By</th>
                                    <th>Set Baseline At</th>
                                    <th className="vbt-action-header">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniqueBaselineRounds.length > 0 ? (
                                    uniqueBaselineRounds.map((item) => {
                                        let formattedDate = 'N/A';
                                        if (item.baselinetrace_at) {
                                            try {
                                                const date = parseISO(item.baselinetrace_at);
                                                if (isValid(date)) {
                                                    // Format example: Apr 13, 2025 16:33
                                                    formattedDate = format(date, 'PP H:mm');
                                                }
                                            } catch (e) { console.error("Date formatting error", e); }
                                        }

                                        return (
                                            <tr key={item.baselinetrace_round}>
                                                <td data-label="Round" className="vbt-td-round">{`BL-${item.baselinetrace_round}`}</td>
                                                <td data-label="Set By">{item.baselinetrace_by || 'N/A'}</td>
                                                <td data-label="Set At">{formattedDate}</td>
                                                <td data-label="Action" className="vbt-td-actions">
                                                    <button
                                                        className="vbt-action-button vbt-view-button"
                                                        onClick={() => handleViewRound(item.baselinetrace_round)}
                                                        title={`View details for baseline round ${item.baselinetrace_round}`}
                                                        aria-label={`View round ${item.baselinetrace_round}`}
                                                    >
                                                        <FontAwesomeIcon icon={faEye} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    // --- If no baseline data found ---
                                    <tr>
                                        <td colSpan="4" className="vbt-no-data">
                                            <p>No baseline has been configured for this project yet.</p>
                                            <span className="vbt-no-data-subtle">Click "Set New Baseline" to create one.</span>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div> {/* End vbt-content */}
        </div> // End vbt-container
    );
};

export default VersionVerTrace;