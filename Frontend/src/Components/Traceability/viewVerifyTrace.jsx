import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./CSS/viewVerifyTrace.css";
import "./CSS/ReviewersPopup.css";
import { format } from 'date-fns';

const ViewVerifyTrace = () => {
    const [verificationData, setVerificationData] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [selectedReviewers, setSelectedReviewers] = useState([]);
    const [combinedSearchQuery, setCombinedSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [searchStatus, setSearchStatus] = useState('');
    const [sortColumn, setSortColumn] = useState('round');
    const [sortDirection, setSortDirection] = useState('asc');
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedDateObject, setSelectedDateObject] = useState(null); // Date object
    const [displayedDate, setDisplayedDate] = useState(''); // mm/dd/yyyy
    const storedUsername = localStorage.getItem("username");
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:3001/getVerificationTrace');
                if (response.data.success) {
                    const filteredData = response.data.data.filter(item => item.project_id == projectId);
                    setVerificationData(filteredData);
                } else {
                    alert('ไม่สามารถดึงข้อมูลได้');
                }
            } catch (error) {
                console.error('Error fetching verification trace data', error);
                alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
            }
        };

        fetchData();
    }, [projectId]);

    const groupedData = verificationData.reduce((acc, item) => {
        const round = item.create_round;
        if (!acc[round]) {
            acc[round] = [];
        }
        acc[round].push(item);
        return acc;
    }, {});

    const handleVerifyClick = (round, projectId, verificationBy, veritraceStatus) => {
        const reviewers = JSON.parse(verificationBy);

        if (!Object.keys(reviewers).includes(storedUsername)) {
            toast.error("❌ Permission Denied: คุณไม่มีสิทธิ์ Verify ในรอบนี้", {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            return;
        }

        navigate(`/verifyTrace?project_id=${projectId}&round=${round}`);
    };

    const handleViewClick = (round, projectId) => {
        navigate(`/verifyTrace?project_id=<span class="math-inline">\{projectId\}&round\=</span>{round}`);
    };

    const handleShowReviewers = (verificationBy) => {
        const parsedReviewers = JSON.parse(verificationBy);
        setSelectedReviewers(parsedReviewers);
        setShowPopup(true);
    };

    const handleSearchChange = (e, field) => {
        switch (field) {
            case 'date':
                setSelectedDate(e.target.value);
                break;
            case 'status':
                setSearchStatus(e.target.value);
                break;
            default:
                setCombinedSearchQuery(e.target.value);
        }
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const filteredAndSortedRounds = Object.keys(groupedData).filter((round) => {
        const roundItems = groupedData[round];
        const firstItem = roundItems[0];
        const date = firstItem.verification_at ? new Date(firstItem.verification_at) : null;
        const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

        const roundMatch = round.toLowerCase().includes(combinedSearchQuery.toLowerCase());
        const createdByMatch = firstItem.create_by.toLowerCase().includes(combinedSearchQuery.toLowerCase());
        const dateMatch = selectedDate === '' || formattedDate === selectedDate;
        const statusMatch = searchStatus === '' || firstItem.veritrace_status.toLowerCase() === searchStatus.toLowerCase();

        return (roundMatch || createdByMatch) && dateMatch && statusMatch;
    }).sort((a, b) => {
        if (sortColumn) {
            const roundItemsA = groupedData[a];
            const roundItemsB = groupedData[b];
            const firstItemA = roundItemsA[0];
            const firstItemB = roundItemsB[0];

            let valueA, valueB;
            switch (sortColumn) {
                case 'round':
                    valueA = a;
                    valueB = b;
                    break;
                case 'createdBy':
                    valueA = firstItemA.create_by;
                    valueB = firstItemB.create_by;
                    break;
                case 'date':
                    valueA = new Date(firstItemA.verification_at).toISOString().split('T')[0];
                    valueB = new Date(firstItemB.verification_at).toISOString().split('T')[0];
                    break;
                case 'status':
                    valueA = firstItemA.veritrace_status;
                    valueB = firstItemB.veritrace_status;
                    break;
                default:
                    return 0;
            }

            if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        }
        return 0;
    });

    return (
        <div className='verify-traceability'>
            <button className="backviewveri-trace" onClick={() =>
                navigate(`/Dashboard?project_id=${projectId}`, {
                    state: { selectedSection: "Traceability" },
                })
            }>Back</button>
            <h1 className='veri-trace-record'>Verification Traceability Record</h1>
            <input
                type="text"
                placeholder="Search Round or Created By"
                value={combinedSearchQuery}
                onChange={(e) => handleSearchChange(e, '')}
                className="search-input-veritrace"
            />
            <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="search-input-veritrace"
            />
            <select
                value={searchStatus}
                onChange={(e) => handleSearchChange(e, 'status')}
                className="search-input-veritrace"
            >
                <option value="" className='option-search-veritrace'>All Status</option>
                <option value="WAITING FOR VERIFICATION">WAITING FOR VERIFICATION</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="BASELINE">BASELINE</option>
            </select>

            <table className="verification-table">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('round')}>Round {sortColumn === 'round' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                        <th onClick={() => handleSort('createdBy')}>Created By {sortColumn === 'createdBy' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                        <th onClick={() => handleSort('date')}>Date {sortColumn === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                        <th onClick={() => handleSort('status')}>Status {sortColumn === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                        <th>Reviewers</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredAndSortedRounds.map((round) => {
                        const roundItems = groupedData[round];
                        const firstItem = roundItems[0];
                        const date = new Date(firstItem.verification_at);
                        const formattedDate = date.toISOString().split('T')[0];

                        const reviewers = Array.from(new Set(
                            roundItems.flatMap(item => Object.keys(JSON.parse(item.verification_by)))
                        ));

                        return (
                            <tr key={round}>
                                <td>{round}</td>
                                <td>{firstItem.create_by}</td>
                                <td>{formattedDate || '-'}</td>
                                <td>{firstItem.veritrace_status}</td>
                                <td>
                                    <button onClick={() => handleShowReviewers(firstItem.verification_by)}>ดู Reviewers</button>
                                </td>
                                <td>
                                    {firstItem.veritrace_status === "VERIFIED" ? (
                                        <button onClick={() => handleViewClick(round, firstItem.project_id)}>
                                            View
                                        </button>
                                    ) : (
                                        <button onClick={() => handleVerifyClick(round, firstItem.project_id, firstItem.verification_by, firstItem.veritrace_status)}>
                                            Verify
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {showPopup && (
                <div className="popup-veri-trace">
                    <div className="popup-veri-trace-reviewer">
                        <h2 className='review-veritrace'>Reviewers</h2>
                        <ul>
                            {Object.entries(selectedReviewers).map(([reviewer, status], index) => (
                                <li key={index}>
                                    {reviewer} {status ?
                                        <span style={{ color: 'green', fontWeight: 'bold' }}>✅</span> :
                                        <span style={{ color: 'red', fontWeight: 'bold' }}>❌</span>
                                    }
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => setShowPopup(false)}>ปิด</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewVerifyTrace;