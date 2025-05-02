import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'; // <<--- แก้ไข Import ให้ครบ
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faHistory, faCalendarAlt, faSearch, faSort, faSortUp,
    faSortDown, faEye, faSpinner, faExclamationTriangle, faCheckCircle, faTimes // เพิ่ม faTimes ถ้าใช้ใน Alert
} from '@fortawesome/free-solid-svg-icons';

// *** ใช้ CSS ไฟล์เดิมที่แก้ปุ่ม Back แล้ว (bh- prefix) ***
import "./CSS/versionVerTrace.css"; // หรือ versionVerTrace.css ตามที่คุณตั้งชื่อ

// --- Component หลัก (ใช้ชื่อ VersionVerTrace หรือ BaselineHistory ตามที่คุณใช้) ---
const VersionVerTrace = () => { // หรือ const BaselineHistory = () => {
    const [verificationData, setVerificationData] = useState([]);
    const [projectName, setProjectName] = useState('');
    const [combinedSearchQuery, setCombinedSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [sortColumn, setSortColumn] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // Alert state - ถ้าใช้ Alert แบบเดิม
    // const [alertType, setAlertType] = useState(null);
    // const [alertMessage, setAlertMessage] = useState("");
    // const [showAlert, setShowAlert] = useState(false);
    // const alertTimeoutRef = useRef(null);


    // Fetch Data Effect
    const fetchInitialData = useCallback(async () => {
        setLoading(true); setError(null); setVerificationData([]); setProjectName('');
        if (!projectId) { setError("Project ID not found."); setLoading(false); return; }
        try {
            try {
                const nameResponse = await axios.get(`http://localhost:3001/projectname?project_id=${projectId}`);
                setProjectName((nameResponse.data && nameResponse.data.length > 0) ? nameResponse.data[0].project_name : `Project ${projectId}`);
            } catch (nameError) { setProjectName(`Project ${projectId}`); }

            const response = await axios.get('http://localhost:3001/getVerificationTrace');
            if (response.data.success && Array.isArray(response.data.data)) {
                const filteredData = response.data.data.filter(item =>
                    String(item.project_id) === String(projectId) &&
                    item.veritrace_status?.toUpperCase() === 'BASELINE'
                );
                setVerificationData(filteredData);
            } else { throw new Error(response.data?.message || 'Could not fetch records.'); }
        } catch (err) { setError(err.message || 'An error occurred.'); }
        finally { setLoading(false); }
    }, [projectId]);

    useEffect(() => {
        fetchInitialData();
        // Cleanup for alert timeout if using custom alert
        // return () => { if (alertTimeoutRef.current) { clearTimeout(alertTimeoutRef.current); } };
    }, [fetchInitialData]);

    // Grouping and Filtering/Sorting
    const uniqueBaselineRounds = useMemo(() => {
        if (!verificationData || verificationData.length === 0) return [];
        const roundMap = new Map();
        for (let i = verificationData.length - 1; i >= 0; i--) {
            const item = verificationData[i];
             if (item && item.hasOwnProperty('create_round') && item.create_round !== null && item.veritrace_status?.toUpperCase() === 'BASELINE') {
                 if (!roundMap.has(item.create_round)) { roundMap.set(item.create_round, item); }
             }
         }
         let roundsArray = Array.from(roundMap.values());
         roundsArray = roundsArray.filter(item => {
            let formattedDate = '';
             if (item.verification_at) {
                 try {
                     const date = parseISO(item.verification_at);
                     if (isValid(date)) { formattedDate = format(date, 'yyyy-MM-dd'); }
                 } catch (e) { console.error("Date parse error:", e); }
             }
             const dateMatch = !selectedDate || formattedDate === selectedDate;
             const query = combinedSearchQuery.toLowerCase();
             const roundMatch = String(item.create_round).toLowerCase().includes(query);
             const createdByMatch = (item.baselinetrace_by || item.create_by)?.toLowerCase().includes(query) ?? false;
             const searchMatch = query === '' || roundMatch || createdByMatch;
             return dateMatch && searchMatch;
         });
         roundsArray.sort((a, b) => {
            if (!sortColumn) return 0; let valueA, valueB;
             switch (sortColumn) {
                 case 'round': valueA = a.create_round || 0; valueB = b.create_round || 0; break;
                 case 'setBy': valueA = a.baselinetrace_by || a.create_by || ''; valueB = b.baselinetrace_by || b.create_by || ''; break;
                 case 'date':
                      const dateStrToUseA = a.baselinetrace_at || a.verification_at;
                      const dateStrToUseB = b.baselinetrace_at || b.verification_at;
                      try { valueA = dateStrToUseA ? new Date(dateStrToUseA).getTime() : 0; } catch { valueA = 0; }
                      try { valueB = dateStrToUseB ? new Date(dateStrToUseB).getTime() : 0; } catch { valueB = 0; }
                      valueA = isNaN(valueA) ? 0 : valueA; valueB = isNaN(valueB) ? 0 : valueB; break;
                 default: return 0;
             }
              if (typeof valueA === 'string' && typeof valueB === 'string') { const comparison = valueA.localeCompare(valueB); return sortDirection === 'asc' ? comparison : comparison * -1; }
              else { const comparison = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0); return sortDirection === 'asc' ? comparison : comparison * -1; }
          });
          return roundsArray;
    }, [verificationData, combinedSearchQuery, selectedDate, sortColumn, sortDirection]);

    // --- Handlers ---
    const handleViewClick = (round) => {
        navigate(`/viewBaselineRound?project_id=${projectId}&round=${round}`); // Navigate to view details
    };
    const handleSearchChange = (e, field) => {
        const value = e.target.value;
        if (field === 'date') { setSelectedDate(value); }
        else { setCombinedSearchQuery(value); }
    };
    const handleSort = (column) => {
        if (sortColumn === column) { setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }
        else { setSortColumn(column); setSortDirection('desc'); }
    };
    const getSortIcon = (column) => {
        if (sortColumn !== column) return faSort;
        return sortDirection === 'asc' ? faSortUp : faSortDown;
    };
    const handleBack = () => { navigate(-1); };

    // --- Render Logic ---
    return (
        <div className='bh-container'>
            {/* Header */}
            <div className="bh-header">
                 <button className="bh-back-btn" onClick={handleBack} aria-label="Go back">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                 </button>
                 <h1 className="bh-title">
                    <FontAwesomeIcon icon={faHistory} className="bh-title-icon" />
                     Baseline History: {projectName}
                 </h1>
            </div>

            {/* Filter Area */}
            <div className="bh-filters">
                <div className="bh-search-wrapper">
                    <FontAwesomeIcon icon={faSearch} className="bh-search-icon" />
                    <input type="text" placeholder="Search Origin Round or Set By..." value={combinedSearchQuery} onChange={(e) => handleSearchChange(e, 'text')} className="bh-search-input" aria-label="Search"/>
                </div>
                <div className="bh-search-wrapper">
                    <FontAwesomeIcon icon={faCalendarAlt} className="bh-search-icon" />
                    <input type="date" value={selectedDate} onChange={(e) => handleSearchChange(e, 'date')} className="bh-search-input bh-date-input" aria-label="Filter by Date"/>
                </div>
            </div>

            {/* Content Area */}
            <div className="bh-content">
                {loading ? ( <div className="bh-loading"><FontAwesomeIcon icon={faSpinner} spin size="2x" /><p>Loading history...</p></div>)
                 : error ? ( <div className="bh-error-message"><FontAwesomeIcon icon={faExclamationTriangle} size="2x" /><p>Error</p><span className="bh-error-details">{error}</span></div>)
                 : (
                    <div className="bh-table-container">
                        <table className="bh-table">
                            <thead>
                                <tr>
                                     <th>#</th>
                                     <th onClick={() => handleSort('round')} aria-label={`Sort by Origin Round ${sortColumn === 'round' ? (sortDirection === 'asc' ? '(asc)' : '(desc)') : ''}`}>Origin Round <FontAwesomeIcon icon={getSortIcon('round')} className="bh-sort-icon" /></th>
                                     <th onClick={() => handleSort('setBy')} aria-label={`Sort by Set By ${sortColumn === 'setBy' ? (sortDirection === 'asc' ? '(asc)' : '(desc)') : ''}`}>Set By <FontAwesomeIcon icon={getSortIcon('setBy')} className="bh-sort-icon" /></th>
                                     <th onClick={() => handleSort('date')} aria-label={`Sort by Date Set ${sortColumn === 'date' ? (sortDirection === 'asc' ? '(asc)' : '(desc)') : ''}`}>Date Set <FontAwesomeIcon icon={getSortIcon('date')} className="bh-sort-icon" /></th>
                                     <th>Status</th>
                                     <th className="bh-action-header">Action</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {uniqueBaselineRounds.length === 0 ? (
                                     <tr><td colSpan="6" className="bh-no-data"><p>No Baseline records found.</p></td></tr>
                                 ) : (
                                     uniqueBaselineRounds.map((item, index) => {
                                         let formattedDate = 'N/A';
                                         const dateToFormat = item.baselinetrace_at || item.verification_at;
                                          if(dateToFormat) { try { const date = parseISO(dateToFormat); if(isValid(date)) { formattedDate = format(date, 'PP H:mm'); } } catch (e) {} }
                                          const setBy = item.baselinetrace_by || item.create_by || 'N/A';
                                          return (
                                             <tr key={item.create_round}>
                                                 <td data-label="#">{index + 1}</td>
                                                 <td data-label="Origin Round" className="bh-td-round">{`Round ${item.create_round}`}</td>
                                                 <td data-label="Set By">{setBy}</td>
                                                 <td data-label="Date Set">{formattedDate}</td>
                                                 <td data-label="Status"><span className="bh-status-badge bh-status-baseline"><FontAwesomeIcon icon={faCheckCircle} /> BASELINE</span></td>
                                                 <td data-label="Action" className="bh-td-actions">
                                                     <button className="bh-action-button bh-view-button" onClick={() => handleViewClick(item.create_round)} aria-label={`View baseline from round ${item.create_round}`} > <FontAwesomeIcon icon={faEye} /> View </button>
                                                 </td>
                                             </tr>
                                         );
                                     })
                                 )}
                             </tbody>
                         </table>
                     </div>
                 )}
             </div> {/* End bh-content */}
         </div> // End bh-container
     ); // <<--- ตรวจสอบวงเล็บปิดของ return
 }; // <<--- ตรวจสอบวงเล็บปิดของ Component

 export default VersionVerTrace; // <<--- ตรวจสอบชื่อ Export