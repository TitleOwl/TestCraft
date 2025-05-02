import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "react-toastify";
import { format, isValid, parseISO } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faListAlt, faUsers, faCheckCircle, faTimesCircle,
    faHourglassHalf, faSort, faSortUp, faSortDown, faSearch, faCalendarAlt,
    faExclamationTriangle, faSpinner, faUser, faTimes // เพิ่ม faTimes สำหรับปุ่มปิด Popup
} from '@fortawesome/free-solid-svg-icons';

// --- CSS Import ---
import "./CSS/viewVerifyTrace.css"; // ตรวจสอบ Path ให้ถูกต้อง

// --- Main Component ---
const ViewVerifyTrace = () => {
    // --- State (เหมือนเดิม) ---
    const [verificationData, setVerificationData] = useState([]);
    const [showReviewerPopup, setShowReviewerPopup] = useState(false);
    const [selectedPopupReviewers, setSelectedPopupReviewers] = useState({});
    const [combinedSearchQuery, setCombinedSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [sortColumn, setSortColumn] = useState('round');
    const [sortDirection, setSortDirection] = useState('asc');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- React Router Hooks (เหมือนเดิม) ---
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // --- อื่นๆ (เหมือนเดิม) ---
    const storedUsername = localStorage.getItem("username");

    // --- Fetch Data Effect (เหมือนเดิม) ---
     useEffect(() => {
         if (!projectId) {
             setError("Project ID not found in URL.");
             setIsLoading(false);
             setVerificationData([]);
             return;
         }
         const fetchData = async () => {
             setIsLoading(true);
             setError(null);
             setVerificationData([]);
             try {
                 const response = await axios.get('http://localhost:3001/getVerificationTrace');
                 if (response.data.success && Array.isArray(response.data.data)) {
                     const projectData = response.data.data.filter(item =>
                         String(item.project_id) === String(projectId)
                     );
                     setVerificationData(projectData);
                 } else {
                     setError(response.data?.message || 'Could not fetch verification records.');
                 }
             } catch (err) {
                 console.error("Error fetching verification data:", err);
                 setError(err.message || 'An error occurred while fetching data.');
             } finally {
                 setIsLoading(false);
             }
         };
         fetchData();
     }, [projectId]);

    // --- Grouping Data by Round (เหมือนเดิม) ---
     const groupedData = useMemo(() => {
         if (!verificationData || verificationData.length === 0) return {};
         return verificationData.reduce((acc, item) => {
             if (item && item.hasOwnProperty('create_round') && item.create_round !== null && item.create_round !== undefined) {
                 const round = item.create_round;
                 if (!acc[round]) { acc[round] = []; }
                 acc[round].push(item);
             } else { console.warn("Skipping invalid item during grouping:", item); }
             return acc;
         }, {});
     }, [verificationData]);

    // --- Filtering (Waiting Status Only) and Sorting Rounds (เหมือนเดิม) ---
    const filteredAndSortedRounds = useMemo(() => {
        return Object.keys(groupedData)
            .map(round => ({ round: round, firstItem: groupedData[round]?.[0] || {} }))
            .filter(({ round, firstItem }) => {
                if (!firstItem || Object.keys(firstItem).length === 0) return false;
                if (firstItem.veritrace_status !== 'WAITING FOR VERIFICATION') return false;

                let formattedDate = '';
                if (firstItem.verification_at) {
                    try {
                         let date = parseISO(firstItem.verification_at);
                         if (!isValid(date)) { date = new Date(firstItem.verification_at); }
                        if (isValid(date)) { formattedDate = format(date, 'yyyy-MM-dd'); }
                    } catch (e) { console.error("Date parsing error:", firstItem.verification_at, e); }
                }
                const dateMatch = !selectedDate || formattedDate === selectedDate;

                const query = combinedSearchQuery.toLowerCase();
                const roundMatch = String(round).toLowerCase().includes(query);
                const createdByMatch = firstItem.create_by?.toLowerCase().includes(query) ?? false;
                const searchMatch = query === '' || roundMatch || createdByMatch;

                return dateMatch && searchMatch;
            })
            .sort((a, b) => {
                if (!sortColumn) return 0;
                const itemA = a.firstItem; const itemB = b.firstItem;
                let valueA, valueB;
                switch (sortColumn) {
                    case 'round': valueA = parseInt(a.round) || 0; valueB = parseInt(b.round) || 0; break;
                    case 'createdBy': valueA = itemA.create_by || ''; valueB = itemB.create_by || ''; break;
                    case 'date':
                         try { valueA = itemA.verification_at ? new Date(itemA.verification_at).getTime() : 0; } catch { valueA = 0; }
                         try { valueB = itemB.verification_at ? new Date(itemB.verification_at).getTime() : 0; } catch { valueB = 0; }
                         valueA = isNaN(valueA) ? 0 : valueA; valueB = isNaN(valueB) ? 0 : valueB; break;
                    case 'status': valueA = itemA.veritrace_status || ''; valueB = itemB.veritrace_status || ''; break;
                    default: return 0;
                }
                 if (typeof valueA === 'string' && typeof valueB === 'string') {
                     const comparison = valueA.localeCompare(valueB);
                     return sortDirection === 'asc' ? comparison : comparison * -1;
                 } else {
                     const comparison = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
                     return sortDirection === 'asc' ? comparison : comparison * -1;
                 }
            })
            .map(({ round }) => round);
    }, [groupedData, combinedSearchQuery, selectedDate, sortColumn, sortDirection]);

    // --- Handlers (เหมือนเดิม) ---
     const handleVerifyClick = (round, itemProjectId, verificationBy) => {
         if (!verificationBy) { toast.error("Cannot find Reviewer data."); return; }
         try {
             const reviewers = JSON.parse(verificationBy);
             if (!Object.keys(reviewers).includes(storedUsername)) {
                 toast.error("❌ Permission Denied.", { autoClose: 3000 }); return;
             }
             navigate(`/verifyTrace?project_id=${itemProjectId}&round=${round}`);
         } catch (e) { toast.error("Invalid Reviewer data."); }
     };

     const handleShowReviewers = (verificationBy) => {
         if (!verificationBy) { setSelectedPopupReviewers({}); setShowReviewerPopup(true); return; }
         try {
             const parsedReviewers = JSON.parse(verificationBy);
             setSelectedPopupReviewers(parsedReviewers); setShowReviewerPopup(true);
         } catch (e) { toast.error("Invalid Reviewer data."); setSelectedPopupReviewers({}); }
     };

     const handleSearchChange = (e, fieldType) => {
         const value = e.target.value;
         if (fieldType === 'date') { setSelectedDate(value); }
         else { setCombinedSearchQuery(value); }
     };

     const handleSort = (column) => {
         if (sortColumn === column) { setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }
         else { setSortColumn(column); setSortDirection('asc'); }
     };

     const getSortIcon = (column) => {
         if (sortColumn !== column) return faSort;
         return sortDirection === 'asc' ? faSortUp : faSortDown;
     };

    // --- Render Logic ---
    return (
        <div className='vvt-container'>
            {/* Header */}
            <div className="vvt-header">
                <button
                    onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } })}
                    className="vvt-back-btn"
                    aria-label="Go back to Dashboard"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1>
                    <FontAwesomeIcon icon={faListAlt} className="vvt-title-icon" />
                    Verification Traceability Records (Waiting)
                </h1>
            </div>

            {/* Filter/Search Area */}
            <div className="vvt-filters">
                <div className="vvt-search-wrapper">
                    <FontAwesomeIcon icon={faSearch} className="vvt-search-icon" />
                    <input
                        type="text"
                        placeholder="Search Round or Created By..."
                        value={combinedSearchQuery}
                        onChange={(e) => handleSearchChange(e, 'text')}
                        className="vvt-search-input"
                        aria-label="Search by Round or Created By"
                    />
                </div>
                <div className="vvt-search-wrapper">
                    <FontAwesomeIcon icon={faCalendarAlt} className="vvt-search-icon" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleSearchChange(e, 'date')}
                        className="vvt-search-input vvt-date-input"
                        aria-label="Filter by Date Created"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="vvt-content">
                {isLoading && (
                    <div className="vvt-loading">
                        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                        <p>Loading verification records...</p>
                    </div>
                )}
                {error && (
                    <div className="vvt-error-message">
                        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
                        <p>{error}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="vvt-table-container">
                        <table className="vvt-table">
                            <thead>
                                <tr>
                                    {/* ทำให้ Header กดได้สะดวกขึ้น */}
                                    <th onClick={() => handleSort('round')} aria-label={`Sort by Round ${sortColumn === 'round' ? (sortDirection === 'asc' ? '(ascending)' : '(descending)') : ''}`}>
                                        Round <FontAwesomeIcon icon={getSortIcon('round')} className="vvt-sort-icon" />
                                    </th>
                                    <th onClick={() => handleSort('createdBy')} aria-label={`Sort by Created By ${sortColumn === 'createdBy' ? (sortDirection === 'asc' ? '(ascending)' : '(descending)') : ''}`}>
                                        Created By <FontAwesomeIcon icon={getSortIcon('createdBy')} className="vvt-sort-icon" />
                                    </th>
                                    <th onClick={() => handleSort('date')} aria-label={`Sort by Date Created ${sortColumn === 'date' ? (sortDirection === 'asc' ? '(ascending)' : '(descending)') : ''}`}>
                                        Date Created <FontAwesomeIcon icon={getSortIcon('date')} className="vvt-sort-icon" />
                                    </th>
                                    <th onClick={() => handleSort('status')} aria-label={`Sort by Status ${sortColumn === 'status' ? (sortDirection === 'asc' ? '(ascending)' : '(descending)') : ''}`}>
                                        Status <FontAwesomeIcon icon={getSortIcon('status')} className="vvt-sort-icon" />
                                    </th>
                                    <th>Reviewers</th>
                                    <th className="vvt-action-header">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedRounds.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="vvt-no-data">
                                            {verificationData.length === 0
                                                ? 'No verification records found for this project.'
                                                : 'No records with status "WAITING FOR VERIFICATION" found matching criteria.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedRounds.map((round) => {
                                        const roundItems = groupedData[round];
                                        const firstItem = roundItems?.[0] || {};
                                        let formattedDate = '-';
                                        if (firstItem.verification_at) {
                                            try {
                                                 let date = parseISO(firstItem.verification_at);
                                                 if (!isValid(date)) { date = new Date(firstItem.verification_at); }
                                                if (isValid(date)) { formattedDate = format(date, 'yyyy-MM-dd HH:mm'); }
                                            } catch (e) { console.error("Date formatting error in row:", e) }
                                        }
                                        const status = firstItem.veritrace_status || '-';
                                        const statusClass = `vvt-status-${status.toLowerCase().replace(/\s+/g, '-')}`;

                                        let reviewersDisplay = <span className="vvt-no-reviewers">-</span>;
                                        let reviewerCount = 0;
                                        if (firstItem.verification_by) {
                                            try {
                                                const parsed = JSON.parse(firstItem.verification_by);
                                                reviewerCount = Object.keys(parsed).length;
                                                if (reviewerCount > 0) {
                                                    reviewersDisplay = (
                                                        <button
                                                            className="vvt-action-button vvt-view-reviewers-button"
                                                            onClick={() => handleShowReviewers(firstItem.verification_by)}
                                                            title="View Reviewer Status"
                                                            aria-label={`View reviewers for round ${round}`}
                                                        >
                                                            <FontAwesomeIcon icon={faUsers} /> ({reviewerCount})
                                                        </button>
                                                    );
                                                }
                                            } catch (e) {
                                                reviewersDisplay = <span className="vvt-error-text">Data Err</span>;
                                            }
                                        }

                                        return (
                                            <tr key={round}>
                                                <td data-label="Round" className="vvt-td-round">{round}</td>
                                                <td data-label="Created By">{firstItem.create_by || '-'}</td>
                                                <td data-label="Date Created">{formattedDate}</td>
                                                <td data-label="Status">
                                                    <span className={`vvt-status-badge ${statusClass}`}>
                                                        <FontAwesomeIcon icon={faHourglassHalf} fixedWidth />
                                                        {status}
                                                    </span>
                                                </td>
                                                <td data-label="Reviewers" className="vvt-td-center">{reviewersDisplay}</td>
                                                <td data-label="Action" className="vvt-td-actions">
                                                    {/* จัดกลุ่มปุ่ม Action */}
                                                    <div className="vvt-action-button-group">
                                                        <button
                                                            className="vvt-action-button vvt-verify-button"
                                                            onClick={() => handleVerifyClick(round, firstItem.project_id, firstItem.verification_by)}
                                                            title="Verify This Record"
                                                            aria-label={`Verify round ${round}`}
                                                        >
                                                             View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div> {/* End vvt-content */}

             {/* Reviewers Popup (โครงสร้างเดิม แต่ใช้ Class ใหม่) */}
            {showReviewerPopup && (
                <div className="vvt-popup-overlay" onClick={() => setShowReviewerPopup(false)}>
                    <div className="vvt-popup-content vvt-reviewer-popup-content" onClick={(e) => e.stopPropagation()}>
                        <div className="vvt-popup-header">
                             <h3>Reviewer Status</h3>
                             <button className="vvt-popup-close" onClick={() => setShowReviewerPopup(false)} title="Close" aria-label="Close popup">
                                 <FontAwesomeIcon icon={faTimes} /> {/* ใช้ faTimes */}
                            </button>
                        </div>
                        <div className="vvt-popup-body">
                            <div className="vvt-reviewer-section">
                                {Object.keys(selectedPopupReviewers).length === 0 ? (
                                    <div className="vvt-empty-message">
                                        No reviewers assigned or data error.
                                    </div>
                                ) : (
                                    <div className="vvt-reviewers-list">
                                        {Object.entries(selectedPopupReviewers).map(([reviewer, status], index) => (
                                            <div className={`vvt-reviewer-item ${status ? 'vvt-verified' : 'vvt-pending'}`} key={index}>
                                                <div className="vvt-reviewer-avatar">
                                                    <FontAwesomeIcon icon={faUser} />
                                                </div>
                                                <div className="vvt-reviewer-info">
                                                    <span className="vvt-reviewer-name">{reviewer}</span>
                                                    <span className="vvt-reviewer-status-text">
                                                        {status ? 'Verified' : 'Pending'}
                                                    </span>
                                                </div>
                                                <FontAwesomeIcon
                                                    icon={status ? faCheckCircle : faHourglassHalf}
                                                    className="vvt-status-icon"
                                                    aria-label={status ? 'Verified' : 'Pending'}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div> // End vvt-container
    );
};

export default ViewVerifyTrace;