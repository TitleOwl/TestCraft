import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
// แนะนำให้สร้าง CSS ใหม่ หรือปรับปรุง CSS เดิมให้เหมาะกับหน้านี้
import "./CSS/viewVerifyTrace.css"; // หรือ ./CSS/baselineHistory.css
import { format } from 'date-fns';

// *** แนะนำ: เปลี่ยนชื่อ Component เป็น BaselineHistory ***
const VersionVerTrace = () => {
    const [verificationData, setVerificationData] = useState([]);
    const [combinedSearchQuery, setCombinedSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    // --- ลบ State searchStatus ออก ---
    // const [searchStatus, setSearchStatus] = useState('');
    const [sortColumn, setSortColumn] = useState('round'); // อาจจะเปลี่ยน default เป็น date หรือ index
    const [sortDirection, setSortDirection] = useState('desc'); // เริ่มจาก index/round ล่าสุดก่อน
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    // Fetch Data Effect (เหมือนเดิม)
    useEffect(() => {
        if (!projectId) {
            setError("Project ID not found in URL."); setIsLoading(false); setVerificationData([]); return;
        }
        const fetchData = async () => {
            setIsLoading(true); setError(null); setVerificationData([]);
            try {
                // ยังคงเรียก API เดิม แต่ข้อมูลจะถูกกรองใน Frontend
                const response = await axios.get('http://localhost:3001/getVerificationTrace');
                console.log("Raw API Response for Baseline History:", response.data);

                if (response.data.success && Array.isArray(response.data.data)) {
                    const filteredData = response.data.data.filter(item => String(item.project_id) === String(projectId));
                    console.log(`Filtered Data for project ${projectId}:`, filteredData);
                    setVerificationData(filteredData);
                } else {
                    console.error("API request failed or data format incorrect:", response.data?.message);
                    setError(response.data?.message || 'Could not fetch history records.');
                }
            } catch (err) {
                console.error('Error fetching verification trace data', err);
                setError(err.message || 'An error occurred while fetching data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    // Grouping Data (เหมือนเดิม)
    const groupedData = useMemo(() => {
        if (!verificationData || verificationData.length === 0) return {};
        return verificationData.reduce((acc, item) => {
            if (item && typeof item === 'object' && item.hasOwnProperty('create_round')) {
                const round = item.create_round;
                if (!acc[round]) acc[round] = [];
                acc[round].push(item);
            } else { console.warn("Skipping invalid item during grouping:", item); }
            return acc;
        }, {});
    }, [verificationData]);

    // --- Filtering and Sorting Rounds (แก้ไขการกรอง Status) ---
    const filteredAndSortedRounds = useMemo(() => {
        return Object.keys(groupedData).filter((round) => {
            const roundItems = groupedData[round];
            if (!roundItems || roundItems.length === 0) return false;
            const firstItem = roundItems[0];
            if (!firstItem) return false;

            // ===== กรองเอาเฉพาะสถานะ BASELINE เท่านั้น =====
            if (!firstItem.veritrace_status || firstItem.veritrace_status.toUpperCase() !== 'BASELINE') {
                return false; // ไม่แสดง Round ที่ไม่ใช่ BASELINE
            }
            let formattedDate = '';
            try { if (firstItem.verification_at) { const date = new Date(firstItem.verification_at); if (!isNaN(date.getTime())) formattedDate = format(date, 'yyyy-MM-dd'); } } catch (e) { console.error("Error formatting date:", e); }
            const roundMatch = String(round).toLowerCase().includes(combinedSearchQuery.toLowerCase());
            const createdByMatch = firstItem.create_by?.toLowerCase().includes(combinedSearchQuery.toLowerCase()) ?? false;
            const dateMatch = !selectedDate || formattedDate === selectedDate;
            // --- ลบ statusMatch ออกจากการ return ---
            return (roundMatch || createdByMatch) && dateMatch;

        }).sort((a, b) => {
            // --- การเรียงลำดับ (เหมือนเดิม แต่พิจารณา default sort) ---
            if (!sortColumn) return 0;
            const roundItemsA = groupedData[a]; const roundItemsB = groupedData[b];
            if (!roundItemsA || !roundItemsB || roundItemsA.length === 0 || roundItemsB.length === 0) return 0;
            const firstItemA = roundItemsA[0]; const firstItemB = roundItemsB[0];
            if (!firstItemA || !firstItemB) return 0;
            let valueA, valueB;
            switch (sortColumn) {
                // --- การเรียงตาม Round (ยังใช้ได้ แต่ในตารางจะแสดง Index) ---
                case 'round': valueA = parseInt(a) || 0; valueB = parseInt(b) || 0; break;
                case 'createdBy': valueA = firstItemA.create_by || ''; valueB = firstItemB.create_by || ''; break;
                case 'date': try { valueA = firstItemA.verification_at ? new Date(firstItemA.verification_at).getTime() : 0; if (isNaN(valueA)) valueA = 0; } catch (e) { valueA = 0; } try { valueB = firstItemB.verification_at ? new Date(firstItemB.verification_at).getTime() : 0; if (isNaN(valueB)) valueB = 0; } catch (e) { valueB = 0; } break;
                // --- Status ไม่ต้องเรียงแล้ว เพราะมีค่าเดียว ---
                // case 'status': valueA = firstItemA.veritrace_status || ''; valueB = firstItemB.veritrace_status || ''; break;
                default: return 0;
            }
            if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        // --- ลบ searchStatus ออกจาก dependencies ---
    }, [groupedData, combinedSearchQuery, selectedDate, sortColumn, sortDirection]);


    // --- Handlers ---
    const handleViewClick = (round, projectId) => {
        // *** สำคัญ: ต้องส่ง round (create_round เดิม) ไปยังหน้า View ไม่ใช่ index ***
        navigate(`/viewTraceVersion?project_id=${projectId}&round=${round}`);
    };

    const handleSearchChange = (e, field) => {
        switch (field) {
            case 'date': setSelectedDate(e.target.value); break;
            // case 'status': setSearchStatus(e.target.value); break; // ลบออก
            default: setCombinedSearchQuery(e.target.value);
        }
    };

    const handleSort = (column) => {
        // --- ป้องกันการ sort ตาม status ---
        if (column === 'status') return;
        // --- อาจจะป้องกันการ sort ตาม index ด้วย ถ้าไม่ต้องการ ---
        // if (column === 'index') return;

        if (sortColumn === column) { setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }
        else { setSortColumn(column); setSortDirection('asc'); }
    };

    // --- Render Logic ---
    return (
        // *** แนะนำ: เปลี่ยน className หลัก ***
        <div className='baseline-history-container'> {/* หรือชื่ออื่น */}
            <button className="backviewveri-trace" onClick={() => navigate(`/Dashboard?project_id=${projectId}`, { state: { selectedSection: "Traceability" } })}>Back</button>
            {/* --- เปลี่ยน Title --- */}
            <h1 className='veri-trace-record'>Baseline History</h1>

            {/* --- ส่วน Filter และ Search (ลบ status select) --- */}
            <div className="filter-container">
                <input type="text" placeholder="Search Original Round / Created By..." value={combinedSearchQuery} onChange={handleSearchChange} className="search-input" />
                <input type="date" value={selectedDate} onChange={(e) => handleSearchChange(e, 'date')} className="date-input" />
            </div>

            {isLoading && <div className="loading-message"><p>Loading data...</p></div>}
            {error && <div className="error-message">{error}</div>}

            {!isLoading && !error && (
                <table className='verification-table'> {/* ใช้ class เดิมหรือสร้างใหม่ */}
                    <thead>
                        <tr>
                            <th>Round</th>
                            <th onClick={() => handleSort('createdBy')}>Created By {sortColumn === 'createdBy' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                            <th onClick={() => handleSort('date')}>Date {sortColumn === 'date' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedRounds.length === 0 ? (
                            // --- ปรับปรุง No data message ---
                            <tr><td colSpan="6" className="no-data-row">No matching Baseline records found.</td></tr>
                        ) : (
                            // --- ใช้ index ในการแสดงผลลำดับ ---
                            filteredAndSortedRounds.map((round, index) => { // <--- เพิ่ม index ตรงนี้
                                const roundItems = groupedData[round];
                                const firstItem = roundItems ? roundItems[0] : {};
                                const formattedDate = firstItem.verification_at ? format(new Date(firstItem.verification_at), 'dd/MM/yyyy') : 'N/A';
                                const status = firstItem.veritrace_status || 'N/A'; // ควรจะเป็น BASELINE เสมอ

                                return (
                                    <tr key={round}> {/* key ยังคงใช้ round เดิมได้ */}
                                        {/* --- แสดง index + 1 --- */}
                                        <td>{index + 1}</td>
                                        <td>{firstItem.create_by || 'N/A'}</td>
                                        <td>{formattedDate}</td>
                                        {/* --- แสดง Status (ซึ่งควรเป็น BASELINE) --- */}
                                        <td>
                                            <span className={`status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td>
                                            {/* --- ปุ่ม View ยังคงใช้ round เดิม --- */}
                                            <button title="View Details" className="view-button" onClick={() => handleViewClick(round, projectId)}>View</button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

// *** แนะนำ: เปลี่ยนชื่อ Export ให้ตรงกับ Component ***
export default VersionVerTrace;