import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "react-toastify";
import "./CSS/viewVerifyTrace.css";
import "./CSS/ReviewersPopup.css";
import { format } from 'date-fns';

const ReviewersPopup = ({ reviewers, onClose }) => {
    // ตรวจสอบ Input ก่อนใช้งาน
    if (!reviewers) {
        console.warn("ReviewersPopup received null or undefined reviewers prop.");
        return null; // ไม่แสดงผลถ้าไม่มีข้อมูล
    }
    // ตรวจสอบว่าเป็น Object จริงๆ
    const isValidObject = typeof reviewers === 'object' && !Array.isArray(reviewers);
    const reviewerEntries = isValidObject ? Object.entries(reviewers) : [];

    if (!isValidObject && Object.keys(reviewers).length > 0) {
        console.warn("ReviewersPopup received non-object reviewers prop:", reviewers);
        // อาจจะแสดงข้อความ Error หรือพยายามแสดงผลแบบอื่นถ้าเป็นไปได้
    }

    return (
        <div className="popup-overlay" onClick={onClose}>
            {/* ทำให้คลิกข้างใน popup ไม่ปิด popup */}
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                <button className="popup-close" onClick={onClose}>×</button>
                <h3>Reviewers & Status</h3>
                {reviewerEntries.length === 0 ? (
                    <p>No reviewers assigned or data format error.</p> // ปรับข้อความ
                ) : (
                    <ul>
                        {reviewerEntries.map(([name, status]) => (
                            <li key={name} className={status ? 'verified' : 'not-verified'}>
                                {name}: {status ?
                                    <span style={{ color: 'green', fontWeight: 'bold' }}> ✅ Verified</span> :
                                    <span style={{ color: 'red', fontWeight: 'bold' }}> ❌ Pending</span>
                                }
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

//  (แสดงเฉพาะ WAITING FOR VERIFICATION) ---
const ViewVerifyTrace = () => {
    // --- State (เหมือนเดิม) ---
    const [verificationData, setVerificationData] = useState([]);
    const [showPopup, setShowPopup] = useState(false); // <<-- State ควบคุม Popup
    const [selectedReviewers, setSelectedReviewers] = useState({}); // <<-- State เก็บข้อมูล Popup
    const [combinedSearchQuery, setCombinedSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [searchStatus, setSearchStatus] = useState(''); // State นี้ยังคงอยู่
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
        if (!projectId) { setError("Project ID not found in URL."); setIsLoading(false); setVerificationData([]); return; }
        const fetchData = async () => {
            setIsLoading(true); setError(null); setVerificationData([]);
            try {
                const response = await axios.get('http://localhost:3001/getVerificationTrace');
                if (response.data.success && Array.isArray(response.data.data)) {
                    const filteredData = response.data.data.filter(item => String(item.project_id) === String(projectId));
                    setVerificationData(filteredData);
                } else { setError(response.data?.message || 'Could not fetch verification records.'); }
            } catch (err) { setError(err.message || 'An error occurred while fetching data.'); }
            finally { setIsLoading(false); }
        };
        fetchData();
    }, [projectId]);

    // --- Grouping Data (เหมือนเดิม) ---
    const groupedData = useMemo(() => {
        if (!verificationData || verificationData.length === 0) return {};
        return verificationData.reduce((acc, item) => {
            if (item?.hasOwnProperty('create_round')) { const round = item.create_round; if (!acc[round]) acc[round] = []; acc[round].push(item); }
            else { console.warn("Skipping invalid item during grouping:", item); } return acc;
        }, {});
    }, [verificationData]);

    // --- Filtering and Sorting Rounds (กรอง WAITING...) ---
    const filteredAndSortedRounds = useMemo(() => {
        return Object.keys(groupedData).filter((round) => {
            const roundItems = groupedData[round]; if (!roundItems?.length) return false; const firstItem = roundItems[0]; if (!firstItem) return false;
            // ===== กรองสถานะ =====
            if (firstItem.veritrace_status !== 'WAITING FOR VERIFICATION') { return false; }
            // =====================
            let formattedDate = ''; try { if (firstItem.verification_at) { const date = new Date(firstItem.verification_at); if (!isNaN(date.getTime())) formattedDate = format(date, 'yyyy-MM-dd'); } } catch (e) { }
            const roundMatch = String(round).toLowerCase().includes(combinedSearchQuery.toLowerCase());
            const createdByMatch = firstItem.create_by?.toLowerCase().includes(combinedSearchQuery.toLowerCase()) ?? false;
            const dateMatch = !selectedDate || formattedDate === selectedDate;
            const statusMatch = !searchStatus || firstItem.veritrace_status?.toLowerCase() === searchStatus.toLowerCase();
            return (roundMatch || createdByMatch) && dateMatch && statusMatch;
        }).sort((a, b) => { /* ... โค้ด sorting ... */
            if (!sortColumn) return 0; const roundItemsA = groupedData[a]; const roundItemsB = groupedData[b]; if (!roundItemsA?.length || !roundItemsB?.length) return 0; const firstItemA = roundItemsA[0]; const firstItemB = roundItemsB[0]; if (!firstItemA || !firstItemB) return 0; let valueA, valueB;
            switch (sortColumn) { case 'round': valueA = parseInt(a) || 0; valueB = parseInt(b) || 0; break; case 'createdBy': valueA = firstItemA.create_by || ''; valueB = firstItemB.create_by || ''; break; case 'date': try { valueA = firstItemA.verification_at ? new Date(firstItemA.verification_at).getTime() : 0; if (isNaN(valueA)) valueA = 0; } catch (e) { valueA = 0; } try { valueB = firstItemB.verification_at ? new Date(firstItemB.verification_at).getTime() : 0; if (isNaN(valueB)) valueB = 0; } catch (e) { valueB = 0; } break; case 'status': valueA = firstItemA.veritrace_status || ''; valueB = firstItemB.veritrace_status || ''; break; default: return 0; }
            if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1; if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1; return 0;
        });
    }, [groupedData, combinedSearchQuery, selectedDate, searchStatus, sortColumn, sortDirection]);

    // --- Handlers (เหมือนเดิม) ---
    const handleVerifyClick = (round, projectId, verificationBy, veritraceStatus) => {
        if (!verificationBy) { toast.error("Cannot find Reviewer data"); return; }
        try { const reviewers = JSON.parse(verificationBy); if (!Object.keys(reviewers).includes(storedUsername)) { toast.error("❌ Permission Denied", { autoClose: 3000 }); return; } navigate(`/verifyTrace?project_id=${projectId}&round=${round}`); }
        catch (e) { console.error("Error parsing VBy in handleVerifyClick:", verificationBy, e); toast.error("Invalid Reviewer data."); }
    };
    const handleShowReviewers = (verificationBy) => {
        console.log("handleShowReviewers called. verification_by:", verificationBy);
        if (!verificationBy) { setSelectedReviewers({}); setShowPopup(true); console.log("No verificationBy data, showing empty popup."); return; }
        try { const parsedReviewers = JSON.parse(verificationBy); setSelectedReviewers(parsedReviewers); setShowPopup(true); console.log("Setting showPopup to true with reviewers:", parsedReviewers); }
        catch (e) { console.error("Error parsing VBy for popup:", verificationBy, e); toast.error("Cannot display reviewers (Invalid data)."); setSelectedReviewers({}); }
    };
    const handleSearchChange = (e, field) => {
        switch (field) { case 'date': setSelectedDate(e.target.value); break; case 'status': setSearchStatus(e.target.value); break; default: setCombinedSearchQuery(e.target.value); }
    };
    const handleSort = (column) => { if (sortColumn === column) { setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); } else { setSortColumn(column); setSortDirection('asc'); } };
    // const handleViewVersion = (projectId) => { navigate(`/versionVerTrace?project_id=${projectId}`); }; // เอาออกถ้าไม่ใช้

    // --- Render Logic ---
    return (
        <div className='verify-traceability'>
            <button className="backviewveri-trace" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } })}>Back</button>
            <h1 className='veri-trace-record'>Verification Traceability Record</h1>
            <div className="filter-container" style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Search Round or Created By" value={combinedSearchQuery} onChange={(e) => handleSearchChange(e, '')} className="search-input-veritrace" />
                <input type="date" value={selectedDate} onChange={(e) => handleSearchChange(e, 'date')} className="search-input-veritrace" />
            </div>

            {isLoading && <div className="loading-message"><p>Loading verification records...</p></div>}
            {error && <div className="error-message">{error}</div>}

            {!isLoading && !error && (
                <table className="verification-table">
                    <thead> {/* ... thead ... */}
                        <tr> <th onClick={() => handleSort('round')} >Round ...</th> <th onClick={() => handleSort('createdBy')} >Created By ...</th> <th onClick={() => handleSort('date')} >Date ...</th> <th onClick={() => handleSort('status')} >Status ...</th> <th>Reviewers</th> <th>Action</th> </tr>
                    </thead>
                    <tbody>
                        {/* ข้อความ No Data */}
                        {filteredAndSortedRounds.length === 0 ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center' }}>
                                {verificationData.length === 0 ? 'No verification records found for this project.' : 'No records with status "WAITING FOR VERIFICATION" found matching criteria.'}
                            </td></tr>
                        ) : (
                            // Map ข้อมูล
                            filteredAndSortedRounds.map((round) => {
                                const roundItems = groupedData[round]; const firstItem = roundItems ? roundItems[0] : {};
                                let formattedDate = '-'; try { if (firstItem.verification_at) formattedDate = format(new Date(firstItem.verification_at), 'yyyy-MM-dd HH:mm'); } catch (e) { }
                                const status = firstItem.veritrace_status || '-';
                                const verificationBy = firstItem.verification_by;
                                let reviewersDisplay = <span>-</span>; try { if (firstItem.verification_by) { const parsed = JSON.parse(firstItem.verification_by); const count = Object.keys(parsed).length; if (count > 0) { reviewersDisplay = <button className="view-reviewers-button" onClick={() => handleShowReviewers(firstItem.verification_by)}>View ({count})</button>; } } } catch (e) { reviewersDisplay = <span style={{ color: 'red' }}>Error</span>; }

                                return (
                                    <tr key={round}>
                                        <td style={{ textAlign: 'center' }}>{round}</td> <td>{firstItem.create_by || '-'}</td> <td>{formattedDate}</td> <td><span className={`status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span></td>
                                        <td style={{ textAlign: 'center' }}>{reviewersDisplay}</td>
                                        <td style={{ textAlign: 'center' }}> {/* ปุ่ม Verify จะแสดงเสมอ */} <button className="action-button verify-button" onClick={() => handleVerifyClick(round, firstItem.project_id, firstItem.verification_by, firstItem.veritrace_status)}>Verify</button> </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            )}

            {/* Reviewers Popup */}
            {showPopup && (
                <div className="popup-veri-trace">
                    <div className="popup-veri-trace-reviewer">
                        <h2 className='review-veritrace'>Reviewers Status</h2>
                        <ul>
                            {Object.keys(selectedReviewers).length === 0 ? (<li>No reviewers assigned or data error.</li>)
                                : (Object.entries(selectedReviewers).map(([reviewer, status], index) => (
                                    <li key={index}>
                                        {reviewer} {status ?
                                            <span style={{ color: 'green', fontWeight: 'bold' }}> ✅ Verified</span> :
                                            <span style={{ color: 'red', fontWeight: 'bold' }}> ❌ Pending</span>
                                        }
                                    </li>
                                )))
                            }
                        </ul>
                        <button className="popup-close-button" onClick={() => setShowPopup(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    )
};

export default ViewVerifyTrace;